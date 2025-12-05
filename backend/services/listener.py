import logging
import time
import threading
import feedparser
import re
from datetime import datetime
from typing import List, Dict, Optional
from ntscraper import Nitter
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Log, Trade, Market
from services.radar import radar_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# RSS Feeds to monitor
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
                # 1. Update targets from Radar
                self._log_system("INFO", "📡 Updating active targets from Radar...")
                self._update_targets()
                
                # 2. Check Twitter (via Nitter)
                self._log_system("INFO", f"🐦 Scanning Twitter for {len(self.targets)} targets...")
                self._check_twitter()
                
                # 3. Check RSS News
                self._log_system("INFO", f"📰 Scanning {len(RSS_FEEDS)} RSS feeds...")
                self._check_news()
                
                self._log_system("INFO", f"Scan cycle complete. Waiting 60s before next scan.")
                # Sleep to avoid rate limits
                time.sleep(60) 
                
            except Exception as e:
                logger.error(f"Error in listener loop: {e}")
                self._log_system("ERROR", f"Listener loop error: {str(e)}")
                time.sleep(60)

    def _update_targets(self):
        """Get active markets from Radar service."""
        try:
            # Get all political events
            events = radar_service.get_political_events(use_cache=True)
            
            # Filter for active ones
            self.targets = [e for e in events if e.get('days_remaining', 0) is not None and e.get('days_remaining', 0) >= 0]
            
            self._log_system("INFO", f"🎯 Listener now tracking {len(self.targets)} active markets")
            logger.info(f"Listener tracking {len(self.targets)} active targets")
        except Exception as e:
            logger.error(f"Failed to update targets: {e}")
            self._log_system("ERROR", f"Failed to update targets: {str(e)}")

    def _check_twitter(self):
        """Scrape tweets for target personalities."""
        handles = {
            'Trump': 'realDonaldTrump',
            'Elon Musk': 'elonmusk',
            'Biden': 'JoeBiden'
        }
        
        # Initialize scraper on first use
        if self.scraper is None:
            try:
                self._log_system("INFO", "🔧 Initializing Nitter scraper...")
                self.scraper = Nitter(log_level=1, skip_instance_check=False)
                self._log_system("INFO", "Nitter scraper initialized successfully")
            except Exception as e:
                self._log_system("ERROR", f"Failed to initialize Nitter scraper: {str(e)}")
                return
        
        for target in self.targets:
            persons = target.get('persons', [])
            for person in persons:
                handle = handles.get(person)
                if not handle:
                    continue
                
                try:
                    self._log_system("INFO", f"🔍 Scraping tweets from @{handle}...")
                    tweets = self.scraper.get_tweets(handle, mode='user', number=5)
                    
                    if tweets and 'tweets' in tweets:
                        self._log_system("INFO", f"✅ Found {len(tweets['tweets'])} recent tweets from @{handle}")
                        for tweet in tweets['tweets']:
                            tweet_id = tweet.get('link')
                            if tweet_id in self.last_tweet_ids:
                                continue
                            
                            self.last_tweet_ids[tweet_id] = time.time()
                            text = tweet.get('text', '')
                            
                            self._log_system("INFO", f"Analyzing tweet: {text[:50]}...")
                            # Check for match
                            self._analyze_content(text, "Twitter", f"@{handle}", target)
                    else:
                        self._log_system("WARNING", f"No tweets returned from @{handle}")
                            
                except Exception as e:
                    logger.warning(f"Failed to scrape twitter for {handle}: {e}")
                    self._log_system("WARNING", f"Twitter scraping failed for @{handle}: {str(e)}")

        # Cleanup old IDs
        current_time = time.time()
        self.last_tweet_ids = {k:v for k,v in self.last_tweet_ids.items() if current_time - v < 86400}

    def _check_news(self):
        """Check RSS feeds."""
        for feed_url in RSS_FEEDS:
            try:
                self._log_system("INFO", f"📡 Parsing RSS feed: {feed_url[:50]}...")
                feed = feedparser.parse(feed_url)
                
                if not feed.entries:
                    self._log_system("WARNING", f"No entries in RSS feed: {feed_url[:50]}")
                    continue
                    
                self._log_system("INFO", f"📄 Found {len(feed.entries)} news articles")
                
                for entry in feed.entries[:10]:  # Limit to 10 most recent
                    link = entry.link
                    if link in self.last_news_links:
                        continue
                    
                    self.last_news_links.add(link)
                    title = entry.title
                    summary = getattr(entry, 'summary', '')
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

        # Check if all keywords are present
        if all(kw in text_lower for kw in keywords):
            self._trigger_snipe(target, text, source_type, source_name)

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
                price=0.50,
                status="FILLED",
                trigger_event=f"{source_type}: {content[:100]}..."
            )
            db.add(trade)
            db.commit()
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
            logger.error(f"Failed to write log: {e}")
        finally:
            db.close()

# Singleton instance
listener_service = SocialListener()
