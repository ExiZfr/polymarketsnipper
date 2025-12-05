import logging
import time
import threading
import re
from typing import List, Dict
from ntscraper import Nitter
import feedparser
from database import SessionLocal
from models import Log, Trade
from services.radar import radar_service
from datetime import datetime

try:
    from services.telegram_notifier import telegram_notifier
except ImportError:
    logger.warning("⚠️ Telegram notifier not available")
    telegram_notifier = None

logger = logging.getLogger(__name__)

# RSS News Feeds
RSS_FEEDS = [
    "https://news.google.com/rss/search?q=Trump+OR+Elon+Musk&hl=en-US&gl=US&ceid=US:en",
    "https://finance.yahoo.com/news/rssindex",
]

class SocialListener:
    def __init__(self):
        self.is_running = False
        self.scraper = None  # Initialize later to avoid startup errors
        self.targets = []
        self.last_tweet_ids = {}
        self.last_news_links = set()
        self.cycle_count = 0  # Track cycles for less frequent target updates
        self.global_keywords = []  # High-value keywords from settings
        self.favorites = set()  # Set of favorited market IDs
        self._load_global_keywords()
        
    def start(self):
        """Start the monitoring loop in a background thread."""
        if self.is_running:
            return
        self.is_running = True
        thread = threading.Thread(target=self._monitor_loop, daemon=True)
        thread.start()
        logger.info("Social Listener started")
        self._log_system("INFO", "🚀 Social Listener module started successfully")

    def stop(self):
        """Stop the monitoring loop."""
        self.is_running = False
        logger.info("Social Listener stopped")
        self._log_system("INFO", "⏹️ Social Listener module stopped")

    def _monitor_loop(self):
        """Main monitoring loop."""
        self._log_system("INFO", "🔄 Listener monitoring loop initialized")
        
        while self.is_running:
            try:
                # Update targets every 10 cycles (not every time to avoid overload)
                if self.cycle_count % 10 == 0:
                    self._log_system("INFO", "📡 Updating active targets from Radar...")
                    self._update_targets()
                
                self.cycle_count += 1
                
                # 2. Check Twitter (via Nitter)
                if len(self.targets) > 0:
                    self._log_system("INFO", f"🐦 Scanning Twitter for {len(self.targets)} targets...")
                    self._check_twitter()
                
                # 3. Check RSS News
                self._log_system("INFO", f"📰 Scanning {len(RSS_FEEDS)} RSS feeds...")
                self._check_news()
                
                # Very short sleep for continuous monitoring (1-3 requests per second)
                time.sleep(2)  # 2 seconds = ~0.5 requests/second per source
                
            except Exception as e:
                logger.error(f"Error in listener loop: {e}")
                self._log_system("ERROR", f"Listener loop error: {str(e)}")
                time.sleep(5)  # Shorter error recovery

    def _update_targets(self):
        """Get active markets from Radar service."""
        try:
            # Get all political events
            events = radar_service.get_political_events(use_cache=True)
            
            # Filter for active ones
            self.targets = [e for e in events if e.get('days_remaining', 0) is not None and e.get('days_remaining', 0) >= 0]
            
            # Load favorites from database
            from models import MarketFavorite
            db = SessionLocal()
            try:
                favorites = db.query(MarketFavorite).all()
                self.favorites = {f.market_id for f in favorites}
                
                # Mark favorited targets and apply priority boost
                for target in self.targets:
                    if target.get('id') in self.favorites:
                        target['is_favorite'] = True
                        target['priority_boost'] = 1.5
                    else:
                        target['is_favorite'] = False
                        target['priority_boost'] = 1.0
                
                # Sort targets: favorites first
                self.targets.sort(key=lambda x: (not x.get('is_favorite', False), -x.get('snipe_score', 0)))
                
                # Check for critical markets and send alerts
                if telegram_notifier:
                    telegram_notifier.reload_config()
                    for target in self.targets:
                        urgency_rate = target.get('urgency_rate', 0)
                        # Send alert for critical markets (90%+ urgency) - only once
                        if urgency_rate >= 90 and not target.get('_notified_critical'):
                            telegram_notifier.send_critical_market_alert(target)
                            target['_notified_critical'] = True  # Mark as notified
                            logger.info(f"?? Sent critical market alert: {target.get('title', 'Unknown')[:60]}")
                
                favorites_count = len([t for t in self.targets if t.get('is_favorite')])
                self._log_system("INFO", f"🎯 Listener tracking {len(self.targets)} markets ({favorites_count} ⭐ favorites)")
                logger.info(f"Listener tracking {len(self.targets)} targets, {favorites_count} favorites, {critical_count} critical")
            finally:
                db.close()
            
            # Reload global keywords every 10 cycles
            if self.cycle_count % 10 == 0:
                self._load_global_keywords()
        except Exception as e:
            logger.error(f"Failed to update targets: {e}")
            self._log_system("ERROR", f"Failed to update targets: {str(e)}")
    
    def _load_global_keywords(self):
        """Load high-value keywords from settings database."""
        try:
            from models import Setting
            db = SessionLocal()
            
            # Get keywords setting
            setting = db.query(Setting).filter(Setting.key == "listener_keywords").first()
            
            if setting and setting.value:
                # Parse comma-separated list
                self.global_keywords = [kw.strip().lower() for kw in setting.value.split(',') if kw.strip()]
                logger.info(f"📋 Loaded {len(self.global_keywords)} global keywords from settings")
            else:
                self.global_keywords = []
                logger.warning("⚠️ No global keywords found in settings")
            
            db.close()
        except Exception as e:
            logger.error(f"Failed to load global keywords: {e}")
            self.global_keywords = []

    def _check_twitter(self):
        """Check Twitter via Nitter for new tweets."""
        # Initialize scraper on first use
        if self.scraper is None:
            try:
                self._log_system("INFO", "🔧 Initializing Nitter scraper...")
                self.scraper = Nitter(log_level=1, skip_instance_check=False)
                self._log_system("INFO", "Nitter scraper initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize scraper: {e}")
                return
        
        # Extract unique Twitter handles from targets
        handles = set()
        for target in self.targets:
            persons = target.get('persons', [])
            for person in persons:
                if 'trump' in person.lower():
                    handles.add('realDonaldTrump')
                elif 'elon' in person.lower() or 'musk' in person.lower():
                    handles.add('elonmusk')
                elif 'biden' in person.lower():
                    handles.add('POTUS')
        
        for handle in handles:
            try:
                self._log_system("INFO", f"🔍 Scraping tweets from @{handle}...")
                tweets = self.scraper.get_tweets(handle, mode='user', number=5)
                
                if tweets and 'tweets' in tweets:
                    self._log_system("INFO", f"✅ Found {len(tweets['tweets'])} recent tweets from @{handle}")
                    for tweet in tweets['tweets']:
                        tweet_id = tweet.get('link')
                        if tweet_id in self.last_tweet_ids:
                            continue
                        
                        self.last_tweet_ids[tweet_id] = True
                        text = tweet.get('text', '')
                        
                        # Analyze against targets
                        for target in self.targets:
                            self._analyze_content(text, "Twitter", f"@{handle}", target)
                
            except Exception as e:
                logger.warning(f"Failed to scrape @{handle}: {e}")
        
        # Keep dict size manageable
        if len(self.last_tweet_ids) > 1000:
            self.last_tweet_ids = dict(list(self.last_tweet_ids.items())[-500:])

    def _check_news(self):
        """Check RSS feeds."""
        for feed_url in RSS_FEEDS:
            try:
                self._log_system("INFO", f"📡 Parsing RSS feed: {feed_url[:50]}...")
                feed = feedparser.parse(feed_url)
                
                if not feed.entries:
                    continue
                    
                self._log_system("INFO", f"📄 Found {len(feed.entries)} news articles")
                
                for entry in feed.entries[:10]:  # Limit to 10 most recent
                    link = entry.link
                    if link in self.last_news_links:
                        continue
                    
                    self.last_news_links.add(link)
                    
                    title = entry.get('title', '')
                    summary = entry.get('summary', '')
                    content = f"{title} {summary}"
                    
                    self._log_system("INFO", f"Analyzing news: {title[:50]}...")
                    # Check against all targets
                    for target in self.targets:
                        self._analyze_content(content, "News", feed_url, target)
                        
            except Exception as e:
                logger.warning(f"Failed to parse RSS {feed_url}: {e}")
                self._log_system("WARNING", f"RSS parsing failed: {str(e)}")
        
        # Keep set size manageable
        if len(self.last_news_links) > 1000:
            self.last_news_links = set(list(self.last_news_links)[-500:])

    def _analyze_content(self, text: str, source_type: str, source_name: str, target: Dict):
        """Analyze content to see if it matches a target market."""
        market_title = target.get('title', '').lower()
        text_lower = text.lower()
        
        # Extract keywords from market title
        keywords = self._extract_keywords(market_title)
        
        if not keywords:
            return

        # Check if this is a favorited market
        is_favorite = target.get('is_favorite', False)
        
        if is_favorite:
            # For favorites: trigger if ANY keyword is found (more aggressive)
            if any(kw in text_lower for kw in keywords):
                self._log_system("INFO", f"⭐ Favorite market triggered: {target.get('title', 'Unknown')}")
                self._trigger_snipe(target, text, source_type, source_name)
                return
        else:
            # For regular markets: require ALL keywords (current behavior)
            if all(kw in text_lower for kw in keywords):
                self._trigger_snipe(target, text, source_type, source_name)
                return
        
        # ALSO check for global high-value keywords
        # If any global keyword + person name matches, it's a signal
        persons = target.get('persons', [])
        for keyword in self.global_keywords:
            if keyword in text_lower:
                # Check if any person from market is mentioned
                for person in persons:
                    if person.lower() in text_lower:
                        self._log_system("INFO", f"🔔 Global keyword '{keyword}' + '{person}' detected!")
                        self._trigger_snipe(target, text, source_type, source_name)
                        return

    def _extract_keywords(self, title: str) -> List[str]:
        """Extract potential trigger keywords from market title."""
        # Look for quoted text: "Will Trump say 'MAGA'?" -> MAGA
        quoted = re.findall(r"['\"](.{2,}?)['\"]", title)
        if quoted:
            return [q.lower() for q in quoted]
        
        return []

    def _trigger_snipe(self, target: Dict, content: str, source_type: str, source_name: str):
        """Trigger a snipe action."""
        logger.info(f"🎯 SNIPE TRIGGERED! Market: {target['title']} | Source: {source_name}")
        
        self._log_system("INFO", f"🎯 SNIPE SIGNAL DETECTED! Market: '{target['title'][:60]}...' matched in {source_type}")
        
        # Send Telegram alert for news detection
        if telegram_notifier:
            news_data = {
                'market_title': target['title'],
                'source_type': source_type,
                'source_name': source_name,
                'content': content,
                'market_url': target.get('url', ''),
                'keywords': target.get('keywords', [])
            }
            telegram_notifier.send_news_alert(news_data)
        
        self._log_system("INFO", f"💰 Placing BUY order for '{target['title'][:50]}...'")
        
        # Record the "Trade" (Simulation)
        db = SessionLocal()
        try:
            trade = Trade(
                market_id=str(target['id']),
                market_title=target['title'],
                side="BUY",
                outcome="YES",
                amount=100.0,
                price=0.5,
                status="FILLED",
                trigger_event=f"{source_type}: {content[:200]}"
            )
            db.add(trade)
            db.commit()
            
            # Send Telegram alert for trade execution
            if telegram_notifier:
                trade_data = {
                    'market_title': target['title'],
                    'side': 'BUY',
                    'amount': 100.0,
                    'price': 0.5,
                    'market_url': target.get('url', ''),
                    'reason': f"Signal from {source_type}: {source_name}"
                }
                telegram_notifier.send_trade_alert(trade_data)
            
            self._log_system("INFO", f"✅ Trade #{trade.id} executed successfully on '{target['title'][:50]}...'")
        except Exception as e:
            logger.error(f"Failed to record trade: {e}")
            self._log_system("ERROR", f"Failed to record trade: {str(e)}")
        finally:
            db.close()

    def _log_system(self, level: str, message: str):
        """Log to database."""
        db = SessionLocal()
        try:
            log = Log(module="Listener", level=level, message=message)
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log to database: {e}")
        finally:
            db.close()

# Singleton instance
listener_service = SocialListener()
