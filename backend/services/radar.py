import requests
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/events"

class PolymarketRadar:
    def __init__(self, cache_ttl_seconds: int = 300):
        """
        Initialize the Polymarket Radar.
        
        Args:
            cache_ttl_seconds: Cache time-to-live in seconds (default 5 minutes)
        """
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'PolymarketBot/1.0'
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
            
            # Add query if provided
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

    def get_tweet_markets(self, use_cache: bool = True) -> List[Dict]:
        """
        Search for markets related to Trump or Elon tweets.
        
        Args:
            use_cache: Whether to use cached results if available
            
        Returns:
            List of filtered market events
        """
        # Check cache first
        if use_cache and self._is_cache_valid():
            logger.info("Returning cached tweet markets")
            return self.cache['data']
        
        # Multiple search strategies
        keywords = [
            "tweet",
            "Trump tweet",
            "Elon tweet", 
            "Musk tweet",
            "Donald Trump tweet",
            "Elon Musk tweet"
        ]
        
        all_events = []
        seen_ids = set()
        
        # First, do a broad search for "tweet" markets
        broad_results = self.search_markets("tweet", limit=100)
        
        for event in broad_results:
            event_id = event.get('id')
            if not event_id or event_id in seen_ids:
                continue
            
            # Extract relevant fields
            title = event.get('title', '').lower()
            description = event.get('description', '').lower()
            
            # Check if it's about Trump or Elon tweets
            targets = ['trump', 'elon', 'musk', 'donald']
            is_relevant = any(target in title or target in description for target in targets)
            
            if is_relevant and 'tweet' in (title + ' ' + description):
                seen_ids.add(event_id)
                
                # Process volume (could be string or number)
                volume = event.get('volume', 0)
                if isinstance(volume, str):
                    try:
                        volume = float(volume)
                    except ValueError:
                        volume = 0
                
                # Extract markets from the event
                markets_data = event.get('markets', [])
                
                all_events.append({
                    "id": event_id,
                    "title": event.get('title', 'Unknown'),
                    "slug": event.get('slug', ''),
                    "description": event.get('description', ''),
                    "markets": markets_data,
                    "volume": volume,
                    "created_at": event.get('createdAt', event.get('created_at', '')),
                    "end_date": event.get('endDate', event.get('end_date', '')),
                    "liquidity": event.get('liquidity', 0),
                    "image": event.get('image', ''),
                    "url": f"https://polymarket.com/event/{event.get('slug', '')}"
                })
        
        # Sort by volume (highest first)
        all_events.sort(key=lambda x: x.get('volume', 0), reverse=True)
        
        # Update cache
        self.cache['data'] = all_events
        self.cache['timestamp'] = datetime.now()
        
        logger.info(f"Found {len(all_events)} tweet-related markets")
        return all_events

    def get_markets_by_person(self, person: str) -> List[Dict]:
        """
        Get markets specifically for a person (Trump or Elon).
        
        Args:
            person: 'trump' or 'elon'
            
        Returns:
            Filtered list of markets
        """
        all_markets = self.get_tweet_markets()
        
        person_lower = person.lower()
        filters = {
            'trump': ['trump', 'donald'],
            'elon': ['elon', 'musk']
        }
        
        keywords = filters.get(person_lower, [person_lower])
        
        filtered = []
        for market in all_markets:
            title = market.get('title', '').lower()
            description = market.get('description', '').lower()
            
            if any(kw in title or kw in description for kw in keywords):
                filtered.append(market)
        
        return filtered

    def clear_cache(self):
        """Manually clear the cache."""
        self.cache['data'] = []
        self.cache['timestamp'] = None
        logger.info("Cache cleared")

# Singleton instance
radar_service = PolymarketRadar()
