import requests
import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import time
import sys
sys.path.append('/app')

try:
    from services.telegram_notifier import telegram_notifier
except ImportError:
    logger.warning("⚠️ Telegram notifier not available")
    telegram_notifier = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/events"

# Event categorization keywords
EVENT_CATEGORIES = {
    'tweet': ['tweet', 'post', 'twitter', 'x.com'],
    'speech': ['speech', 'address', 'rally', 'speak at'],
    'announcement': ['announce', 'reveal', 'disclose', 'unveil'],
    'interview': ['interview', 'appearance', 'podcast', 'show'],
    'statement': ['statement', 'declare', 'proclaim', 'press conference'],
    'reaction': ['respond', 'react', 'comment on', 'reply'],
    'action': ['do', 'will', 'happen', 'occur']
}

# Political figures to track
POLITICAL_FIGURES = [
    'trump', 'donald trump',
    'biden', 'joe biden',
    'elon', 'musk', 'elon musk',
    'putin', 'vladimir putin',
    'xi', 'xi jinping',
    'macron', 'emmanuel macron',
    'johnson', 'boris johnson',
    'trudeau', 'justin trudeau',
    'netanyahu', 'benjamin netanyahu',
    'zelensky', 'volodymyr zelensky'
]

class PolymarketRadar:
    def __init__(self, cache_ttl_seconds: int = 300):
        """
        Initialize the Polymarket Radar.
        
        Args:
            cache_ttl_seconds: Cache time-to-live in seconds (default 5 minutes)
        """
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'PolymarketBot/2.0'
        })
        self.cache = {
            'data': [],
            'timestamp': None,
            'ttl': cache_ttl_seconds
        }
        self._notified_critical_markets = set()  # Track markets we've already notified about

    def _is_cache_valid(self) -> bool:
        """Check if cached data is still valid."""
        if not self.cache['timestamp']:
            return False
        elapsed = (datetime.now() - self.cache['timestamp']).total_seconds()
        return elapsed < self.cache['ttl']

    def _categorize_event(self, title: str, description: str) -> Tuple[str, List[str]]:
        """
        Categorize an event based on keywords.
        
        Returns:
            Tuple of (category, list of detected persons)
        """
        text = (title + ' ' + description).lower()
        
        # Detect category
        detected_category = 'other'
        for category, keywords in EVENT_CATEGORIES.items():
            if any(kw in text for kw in keywords):
                detected_category = category
                break
        
        # Detect persons
        detected_persons = []
        for person in POLITICAL_FIGURES:
            if person in text:
                # Add the full name version
                if person in ['trump', 'donald trump']:
                    detected_persons.append('Trump')
                elif person in ['biden', 'joe biden']:
                    detected_persons.append('Biden')
                elif person in ['elon', 'musk', 'elon musk']:
                    detected_persons.append('Elon Musk')
                elif person in ['putin', 'vladimir putin']:
                    detected_persons.append('Putin')
                # Add others as needed
                
        # Remove duplicates
        detected_persons = list(set(detected_persons))
        
        return detected_category, detected_persons

    def _assess_trigger_clarity(self, event: Dict) -> float:
        """
        Assess how clear the trigger event is (0-1).
        Higher = easier to detect when it happens.
        """
        title = event.get('title', '').lower()
        category = event.get('category', 'other')
        
        # Tweet-based markets are clearest
        if category == 'tweet' or 'tweet' in title:
            # Check if specific content is required
            if '"' in event.get('title', '') or "'" in event.get('title', ''):
                return 1.0  # Specific tweet content
            return 0.9  # General tweet
        
        # Speech/announcement with quoted content
        if (category in ['speech', 'announcement', 'statement']) and ('"' in event.get('title', '') or "'" in event.get('title', '')):
            return 0.9
        
        # General announcement/speech
        if category in ['speech', 'announcement', 'statement']:
            return 0.7
        
        # Action-based with clear deadline
        if 'before' in title or 'by ' in title:
            return 0.6
        
        # Vague or unclear
        return 0.3

    def _assess_monitorability(self, event: Dict) -> float:
        """
        Assess how easily we can monitor this event (0-1).
        Higher = easier to track in real-time.
        """
        title = event.get('title', '').lower()
        category = event.get('category', 'other')
        
        # Twitter/social media - perfect monitoring
        if category == 'tweet' or 'tweet' in title or 'post' in title:
            return 1.0
        
        # News-based events
        if category in ['announcement', 'statement'] or 'announce' in title:
            return 0.8
        
        # Public speeches
        if category == 'speech' or 'speech' in title:
            return 0.7
        
        # Interviews/shows
        if category == 'interview':
            return 0.6
        
        # Vague actions
        if category == 'action':
            return 0.4
        
        return 0.3

    def _assess_reaction_speed(self, event: Dict) -> float:
        """
        Assess required reaction speed (0-1).
        Higher = more time to react after trigger.
        """
        title = event.get('title', '').lower()
        category = event.get('category', 'other')
        days_remaining = event.get('days_remaining')
        
        # Tweet-based: need instant reaction
        if category == 'tweet':
            return 1.0
        
        # News/announcements: minutes to hours
        if category in ['announcement', 'statement', 'speech']:
            return 0.7
        
        # Long-term events
        if days_remaining and days_remaining > 30:
            return 0.2
        
        return 0.5

    def _calculate_snipe_score(self, event: Dict) -> float:
        """
        Calculate advanced snipability score.
        
        New criteria:
        - Trigger clarity (30%)
        - Monitorability (25%)
        - Reaction speed (20%)
        - Urgency (15%)
        - Volume (5%)
        - Liquidity (5%)
        
        Returns:
            Float between 0 and 1
        """
        # New criteria
        trigger_clarity = self._assess_trigger_clarity(event)
        monitorability = self._assess_monitorability(event)
        reaction_speed = self._assess_reaction_speed(event)
        
        # Urgency score (0-1, higher = more urgent)
        urgency_score = 0.0
        end_date_str = event.get('end_date') or event.get('endDate')
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                days_remaining = (end_date - datetime.now()).days
                if days_remaining < 0:
                    urgency_score = 0
                elif days_remaining <= 1:
                    urgency_score = 1.0
                elif days_remaining <= 7:
                    urgency_score = 0.9
                elif days_remaining <= 30:
                    urgency_score = 0.7
                elif days_remaining <= 90:
                    urgency_score = 0.4
                else:
                    urgency_score = 0.1
            except:
                urgency_score = 0.3
        
        # Liquidity score (0-1)
        liquidity = float(event.get('liquidity', 0))
        liquidity_score = min(liquidity / 50000, 1.0)
        
        # Volume score (0-1)
        volume = float(event.get('volume', 0))
        volume_score = min(volume / 100000, 1.0)
        
        # Weighted average with new weights
        snipe_score = (
            trigger_clarity * 0.30 +
            monitorability * 0.25 +
            reaction_speed * 0.20 +
            urgency_score * 0.15 +
            volume_score * 0.05 +
            liquidity_score * 0.05
        )
        
        return round(snipe_score, 2)

    def _is_snipable(self, event: Dict) -> bool:
        """
        Determine if a market should be displayed.
        Filters out non-snipable markets.
        """
        score = event.get('snipe_score', 0)
        volume = event.get('volume', 0)
        days_remaining = event.get('days_remaining')
        
        # RELAXED FILTERS - Show more markets
        if score < 0.20:  # 45%+ snipability MINIMUM
            return False
        
        # High volume required for liquidity
        if volume < 500:  # $5K minimum
            return False
        
        # Require clear trigger (no vague markets)
        trigger_clarity = event.get('score_breakdown', {}).get('trigger_clarity', 0)
        if trigger_clarity < 20:  # Must have clear triggering event
            return False
        
        # Too far in future
        if days_remaining and days_remaining > 120:
            return False
        
        # Expired
        if days_remaining is not None and days_remaining < 0:
            return False
        
        return True

    def _get_urgency_level(self, end_date_str: Optional[str]) -> str:
        """Get urgency level based on end date."""
        if not end_date_str:
            return 'unknown'
        
        try:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            days_remaining = (end_date - datetime.now()).days
            
            if days_remaining < 0:
                return 'expired'
            elif days_remaining <= 1:
                return 'critical'
            elif days_remaining <= 7:
                return 'high'
            elif days_remaining <= 30:
                return 'medium'
            else:
                return 'low'
        except:
            return 'unknown'

    def search_markets(self, query: str, limit: int = 100) -> List[Dict]:
        """
        Search for markets using the Gamma API.
        
        Args:
            query: Search query string
            limit: Maximum number of results
            
        Returns:
            List of market events
        """
        try:
            params = {
                "limit": limit,
                "active": "true",
                "closed": "false",
                "archived": "false"
            }
            
            if query:
                params["query"] = query
            
            response = self.session.get(GAMMA_API_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Retrieved {len(data)} events from Polymarket API")
            return data
        
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error occurred: {e}")
            return []
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error occurred: {e}")
            return []
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout error occurred: {e}")
            return []
        except ValueError as e:
            logger.error(f"JSON parsing error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return []

    def get_political_events(self, use_cache: bool = True) -> List[Dict]:
        """
        Search for all snipable political events with improved filtering.
        
        Args:
            use_cache: Whether to use cached results if available
            
        Returns:
            List of enriched political events
        """
        # Check cache first
        if use_cache and self._is_cache_valid():
            logger.info("Returning cached political events")
            return self.cache['data']
        
        # Targeted search queries for snipable markets
        search_queries = [
            "tweet say",      # Tweet-based markets
            "announce before", # Time-bound announcements
            "speech mention",  # Speech content markets
            "trump elon",      # High-profile figures
            "biden president", # Political markets
            "crypto mention",  # Crypto-related (high activity)
        ]
        
        all_events = []
        seen_ids = set()
        
        logger.info(f"Starting market scan with {len(search_queries)} search queries...")
        
        # Search with each query
        for query in search_queries:
            results = self.search_markets(query, limit=500)  # Maximum API allows - scan everything
            logger.info(f"Query '{query}': found {len(results)} raw results")
            
            for event in results:
                event_id = event.get('id')
                if not event_id or event_id in seen_ids:
                    continue
                
                title = event.get('title', '')
                description = event.get('description', '')
                
                seen_ids.add(event_id)
                
                # Categorize
                category, persons = self._categorize_event(title, description)
                
                # Process volume
                volume = event.get('volume', 0)
                if isinstance(volume, str):
                    try:
                        volume = float(volume)
                    except ValueError:
                        volume = 0
                
                # Build enriched event
                enriched_event = {
                    "id": event_id,
                    "title": event.get('title', 'Unknown'),
                    "slug": event.get('slug', ''),
                    "description": event.get('description', ''),
                    "category": category,
                    "persons": persons,
                    "markets": event.get('markets', []),
                    "volume": volume,
                    "liquidity": event.get('liquidity', 0),
                    "created_at": event.get('createdAt', event.get('created_at', '')),
                    "end_date": event.get('endDate', event.get('end_date', '')),
                    "image": event.get('image', ''),
                    "url": f"https://polymarket.com/event/{event.get('slug', '')}"
                }
                
                # Calculate days remaining
                if enriched_event['end_date']:
                    try:
                        end_date = datetime.fromisoformat(enriched_event['end_date'].replace('Z', '+00:00'))
                        enriched_event['days_remaining'] = max(0, (end_date - datetime.now()).days)
                    except:
                        enriched_event['days_remaining'] = None
                else:
                    enriched_event['days_remaining'] = None
                
                # Calculate snipe score (MUST be before _is_snipable check)
                enriched_event['snipe_score'] = self._calculate_snipe_score(enriched_event)
                enriched_event['urgency'] = self._get_urgency_level(enriched_event['end_date'])
                
                # Calculate urgency rate from days remaining
                days_remaining = enriched_event.get('days_remaining')
                urgency_rate = 0
                if days_remaining is not None:
                    if days_remaining <= 0:
                        urgency_rate = 0
                    elif days_remaining <= 1:
                        urgency_rate = 100
                    elif days_remaining <= 7:
                        urgency_rate = 90
                    elif days_remaining <= 30:
                        urgency_rate = 70
                    elif days_remaining <= 90:
                        urgency_rate = 40
                    else:
                        urgency_rate = 10
                
                enriched_event['urgency_rate'] = urgency_rate
                
                # Add detailed score breakdown for frontend
                enriched_event['score_breakdown'] = {
                    'trigger_clarity': round(self._assess_trigger_clarity(enriched_event) * 100),
                    'monitorability': round(self._assess_monitorability(enriched_event) * 100),
                    'reaction_speed': round(self._assess_reaction_speed(enriched_event) * 100),
                    'urgency': urgency_rate
                }
                
                # Filter: Only keep snipable markets
                if self._is_snipable(enriched_event):
                    all_events.append(enriched_event)
                    
                    # Send Telegram alert for critical urgency markets
                    if enriched_event.get('urgency_rate', 0) >= 90:
                        market_id = enriched_event.get('id')
                        if market_id and market_id not in self._notified_critical_markets and telegram_notifier:
                            logger.info(f"🚨 Critical market detected: {enriched_event.get('title')[:50]}...")
                            if telegram_notifier.send_critical_market_alert(enriched_event):
                                self._notified_critical_markets.add(market_id)
                                logger.info(f"✅ Telegram alert sent for market {market_id}")
                            else:
                                logger.warning(f"⚠️ Failed to send Telegram alert for market {market_id}")
        
        # Sort by snipe score (highest first)
        all_events.sort(key=lambda x: x.get('snipe_score', 0), reverse=True)
        
        # Update cache
        self.cache['data'] = all_events
        self.cache['timestamp'] = datetime.now()
        
        logger.info(f"✓ Radar scan complete: {len(all_events)} high-quality snipable markets detected")
        return all_events

    def get_tweet_markets(self, use_cache: bool = True) -> List[Dict]:
        """
        Legacy method - returns only tweet-related events.
        """
        all_events = self.get_political_events(use_cache)
        return [e for e in all_events if e['category'] == 'tweet']

    def get_markets_by_person(self, person: str) -> List[Dict]:
        """
        Get markets specifically for a person.
        
        Args:
            person: Name of the person (e.g., 'trump', 'biden', 'elon')
        
        Returns:
            List of markets related to that person
        """
        all_events = self.get_political_events()
        person_lower = person.lower()
        
        # Filter by person in title, description, or detected persons
        filtered = []
        for event in all_events:
            text = (event.get('title', '') + ' ' + event.get('description', '')).lower()
            detected_persons = [p.lower() for p in event.get('persons', [])]
            
            if person_lower in text or person_lower in detected_persons:
                filtered.append(event)
        
        return filtered

    def get_events_by_category(self, category: str) -> List[Dict]:
        """Get events by category (tweet, speech, etc.)"""
        all_events = self.get_political_events()
        return [e for e in all_events if e.get('category') == category]

    def get_urgent_events(self, min_urgency: str = 'medium') -> List[Dict]:
        """
        Get urgent events.
        
        Args:
            min_urgency: Minimum urgency level ('critical', 'high', 'medium', 'low')
        """
        urgency_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1, 'unknown': 0}
        min_level = urgency_order.get(min_urgency, 2)
        
        all_events = self.get_political_events()
        return [e for e in all_events if urgency_order.get(e.get('urgency', 'unknown'), 0) >= min_level]

    def clear_cache(self):
        """Clear the cache to force refresh."""
        self.cache['data'] = []
        self.cache['timestamp'] = None
        logger.info("Cache cleared")

# Singleton instance
radar_service = PolymarketRadar()
