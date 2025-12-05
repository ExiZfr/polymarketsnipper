import requests
import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import time

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

    def _calculate_snipe_score(self, event: Dict) -> float:
        """
        Calculate snipability score for an event.
        
        Score based on:
        - Urgency (days remaining)
        - Liquidity
        - Volume
        - Clarity (how specific the market is)
        
        Returns:
            Float between 0 and 1
        """
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
                    urgency_score = 0.8
                elif days_remaining <= 30:
                    urgency_score = 0.5
                else:
                    urgency_score = 0.2
            except:
                urgency_score = 0.3
        
        # Liquidity score (0-1)
        liquidity = float(event.get('liquidity', 0))
        liquidity_score = min(liquidity / 100000, 1.0)  # Normalize to 100k
        
        # Volume score (0-1)
        volume = float(event.get('volume', 0))
        volume_score = min(volume / 500000, 1.0)  # Normalize to 500k
        
        # Clarity score (0-1, based on title length and specificity)
        title = event.get('title', '')
        clarity_score = 0.7  # Base score
        if len(title) > 50:  # Specific markets tend to have longer titles
            clarity_score = 0.8
        if 'before' in title.lower() or 'by' in title.lower():  # Has deadline
            clarity_score = 0.9
        
        # Weighted average
        snipe_score = (
            urgency_score * 0.4 +
            liquidity_score * 0.3 +
            volume_score * 0.2 +
            clarity_score * 0.1
        )
        
        return round(snipe_score, 2)

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
                params["q"] = query
            
            logger.info(f"Searching Polymarket with query: '{query}'")
            response = self.session.get(GAMMA_API_URL, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Handle both array response and paginated response
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and 'data' in data:
                return data['data']
            else:
                logger.warning(f"Unexpected API response format: {type(data)}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error searching markets for query '{query}': {e}")
            return []
        except ValueError as e:
            logger.error(f"JSON parsing error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return []

    def get_political_events(self, use_cache: bool = True) -> List[Dict]:
        """
        Search for all snipable political events.
        
        Args:
            use_cache: Whether to use cached results if available
            
        Returns:
            List of enriched political events
        """
        # Check cache first
        if use_cache and self._is_cache_valid():
            logger.info("Returning cached political events")
            return self.cache['data']
        
        # Broad search strategies
        search_queries = [
            "will",      # "Will Trump say..."
            "announce",  # "Biden to announce..."
            "tweet",     # Tweet markets
            "say",       # "Will X say Y..."
            "mention"    # "Mention Z in speech..."
        ]
        
        all_events = []
        seen_ids = set()
        
        # Search with each query
        for query in search_queries:
            results = self.search_markets(query, limit=50)
            
            for event in results:
                event_id = event.get('id')
                if not event_id or event_id in seen_ids:
                    continue
                
                title = event.get('title', '')
                description = event.get('description', '')
                
                # Check if it's politically relevant
                text_lower = (title + ' ' + description).lower()
                is_political = any(person in text_lower for person in POLITICAL_FIGURES)
                
                if is_political:
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
                    
                    # Calculate snipe score
                    enriched_event['snipe_score'] = self._calculate_snipe_score(enriched_event)
                    enriched_event['urgency'] = self._get_urgency_level(enriched_event['end_date'])
                    
                    # Calculate days remaining
                    if enriched_event['end_date']:
                        try:
                            end_date = datetime.fromisoformat(enriched_event['end_date'].replace('Z', '+00:00'))
                            enriched_event['days_remaining'] = max(0, (end_date - datetime.now()).days)
                        except:
                            enriched_event['days_remaining'] = None
                    else:
                        enriched_event['days_remaining'] = None
                    
                    all_events.append(enriched_event)
        
        # Sort by snipe score (highest first)
        all_events.sort(key=lambda x: x.get('snipe_score', 0), reverse=True)
        
        # Update cache
        self.cache['data'] = all_events
        self.cache['timestamp'] = datetime.now()
        
        logger.info(f"Found {len(all_events)} political events")
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
            Filtered list of markets
        """
        all_markets = self.get_political_events()
        person_lower = person.lower()
        
        filtered = []
        for market in all_markets:
            # Check if person is in the detected persons list
            if any(person_lower in p.lower() for p in market.get('persons', [])):
                filtered.append(market)
        
        return filtered

    def get_events_by_category(self, category: str) -> List[Dict]:
        """Get events by category."""
        all_events = self.get_political_events()
        return [e for e in all_events if e['category'] == category]

    def get_urgent_events(self, urgency: str = 'high') -> List[Dict]:
        """Get events by urgency level."""
        all_events = self.get_political_events()
        valid_urgencies = ['critical', 'high', 'medium', 'low']
        
        if urgency in valid_urgencies:
            idx = valid_urgencies.index(urgency)
            return [e for e in all_events if e['urgency'] in valid_urgencies[:idx+1]]
        
        return all_events

    def clear_cache(self):
        """Manually clear the cache."""
        self.cache['data'] = []
        self.cache['timestamp'] = None
        logger.info("Cache cleared")

# Singleton instance
radar_service = PolymarketRadar()
