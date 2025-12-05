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
    # Add more feeds here
]

class SocialListener:
    def __init__(self):
        self.is_running = False
        self.scraper = Nitter(log_level=1, skip_instance_check=False)
        self.targets = []
        self.last_tweet_ids = {} # Keep track of last seen tweets to avoid duplicates
        self.last_news_links = set() # Keep track of last seen news
        
    def start(self):
        """Start the monitoring loop in a background thread."""
        if self.is_running:
            return
        
        self.is_running = True
        thread = threading.Thread(target=self._monitor_loop, daemon=True)
        thread.start()
        logger.info("Social Listener started")
        self._log_system("INFO", "Social Listener module started")

    def stop(self):
        """Stop the monitoring loop."""
        self.is_running = False
        logger.info("Social Listener stopped")
        self._log_system("INFO", "Social Listener module stopped")

    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.is_running:
            try:
                # 1. Update targets from Radar
                self._update_targets()
                
                # 2. Check Twitter (via Nitter)
                self._check_twitter()
                
                # 3. Check RSS News
                self._check_news()
                
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
            
            logger.info(f"Listener tracking {len(self.targets)} active targets")
        except Exception as e:
            logger.error(f"Failed to update targets: {e}")

    def _check_twitter(self):
        """Scrape tweets for target personalities."""
        # Map of common handles
        handles = {
            'Trump': 'realDonaldTrump',
            'Elon Musk': 'elonmusk',
            'Biden': 'JoeBiden'
        }
        
        for target in self.targets:
            persons = target.get('persons', [])
            for person in persons:
                handle = handles.get(person)
                if not handle:
                    continue
                
                try:
                    # Scrape user tweets
                    tweets = self.scraper.get_tweets(handle, mode='user', number=5)
                    
                    if tweets and 'tweets' in tweets:
                        for tweet in tweets['tweets']:
                            tweet_id = tweet.get('link')
                            if tweet_id in self.last_tweet_ids:
                                continue
                            
                            self.last_tweet_ids[tweet_id] = time.time()
                            text = tweet.get('text', '')
                            
                            # Check for match
                            self._analyze_content(text, "Twitter", f"@{handle}", target)
                            
                except Exception as e:
                    logger.warning(f"Failed to scrape twitter for {handle}: {e}")

        # Cleanup old IDs
        current_time = time.time()
        self.last_tweet_ids = {k:v for k,v in self.last_tweet_ids.items() if current_time - v < 86400}

    def _check_news(self):
        """Check RSS feeds."""
        for feed_url in RSS_FEEDS:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries:
                    link = entry.link
                    if link in self.last_news_links:
                        continue
                    
                    self.last_news_links.add(link)
                    title = entry.title
                    summary = getattr(entry, 'summary', '')
                    content = f"{title} {summary}"
                    
                    # Check against all targets
                    for target in self.targets:
                        self._analyze_content(content, "News", feed_url, target)
                        
            except Exception as e:
                logger.warning(f"Failed to parse RSS {feed_url}: {e}")
        
        # Keep set size manageable
        if len(self.last_news_links) > 1000:
            self.last_news_links = set(list(self.last_news_links)[-500:])

    def _analyze_content(self, text: str, source_type: str, source_name: str, target: Dict):
        """Analyze content to see if it matches a target market."""
        # Simple keyword matching for now
        # In a real system, this would use more advanced NLP or specific rules
        
        market_title = target.get('title', '').lower()
        text_lower = text.lower()
        
        # Extract keywords from market title (very basic heuristic)
        # e.g. "Will Trump say 'crypto'?" -> keywords: crypto
        keywords = self._extract_keywords(market_title)
        
        if not keywords:
            return

        # Check if all keywords are present
        if all(kw in text_lower for kw in keywords):
            self._trigger_snipe(target, text, source_type, source_name)

    def _extract_keywords(self, title: str) -> List[str]:
        """Extract potential trigger keywords from market title."""
        # This is a placeholder logic. Real logic needs to be much smarter.
        # It looks for words in quotes or specific patterns.
        
        # Look for quoted text: "Will Trump say 'MAGA'?" -> MAGA
        quoted = re.findall(r"['\"](.*?)['\"]", title)
        if quoted:
            return [q.lower() for q in quoted]
        
        return []

    def _trigger_snipe(self, target: Dict, content: str, source_type: str, source_name: str):
        """Trigger a snipe action."""
        logger.info(f"SNIPE TRIGGERED! Market: {target['title']} | Source: {source_name}")
        
        self._log_system("INFO", f"SNIPE SIGNAL: {target['title']} detected in {source_type}")
        
        # Record the "Trade" (Simulation)
        db = SessionLocal()
        try:
            trade = Trade(
                market_id=str(target['id']),
                market_title=target['title'],
                side="BUY", # Default to BUY YES
                outcome="YES",
                amount=100.0, # Mock amount
                price=0.50, # Mock price
                status="FILLED", # Simulated fill
                trigger_event=f"{source_type}: {content[:50]}..."
            )
            db.add(trade)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to record trade: {e}")
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
