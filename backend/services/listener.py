import logging
import time
import threading
import re
from typing import List, Dict
from ntscraper import Nitter
import feedparser
from database import SessionLocal
from models import Log, Trade, Favorite
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

    def _load_favorites(self):
        """Load favorites from database."""
        try:
            db = SessionLocal()
            favorites = db.query(Favorite).all()
            db.close()
            return favorites
        except Exception as e:
            logger.error(f"Failed to load favorites: {e}")
            return []

    def _update_targets(self):
        """Get active markets from Radar service and Favorites."""
        try:
            # 1. Get all political events from Radar
            events = radar_service.get_political_events(use_cache=True)
            
            # 2. Get Favorites from database
            favorites = self._load_favorites()
            
            # 3. Merge and prioritize
            # Create a map of existing events for quick lookup
            event_map = {e['id']: e for e in events}
            
            final_targets = []
            
            # Add favorites first (Priority)
            for fav in favorites:
                market_id = fav.market_id
                if market_id in event_map:
                    # Use the fresh data from radar if available
                    market_data = event_map[market_id]
                    market_data['is_favorite'] = True # Mark as favorite
                    final_targets.append(market_data)
                else:
                    # If not in radar (maybe filtered out?), construct minimal target from favorite
                    final_targets.append({
                        'id': fav.market_id,
                        'title': fav.market_title,
                        'url': fav.market_url,
                        'keywords': self._extract_keywords(fav.market_title),
                        'is_favorite': True
                    })
            
            # Add remaining radar events
            favorite_ids = {f.market_id for f in favorites}
            for event in events:
                if event['id'] not in favorite_ids:
                    if event.get('days_remaining', 0) is not None and event.get('days_remaining', 0) >= 0:
                        final_targets.append(event)
            
            self.targets = final_targets
            
            self._log_system("INFO", f"🎯 Listener now tracking {len(self.targets)} active markets ({len(favorites)} favorites)")
            logger.info(f"Listener tracking {len(self.targets)} active targets")
            
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

        # Check if all market keywords are present
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
