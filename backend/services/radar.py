import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GAMMA_API_URL = "https://gamma-api.polymarket.com/events"

class PolymarketRadar:
    def __init__(self):
        self.session = requests.Session()

    def search_markets(self, query: str):
        """
        Search for markets using the Gamma API.
        """
        try:
            params = {
                "limit": 50,
                "active": "true",
                "closed": "false",
                "archived": "false",
                "q": query
            }
            response = self.session.get(GAMMA_API_URL, params=params)
            response.raise_for_status()
            data = response.json()
            return data
        except Exception as e:
            logger.error(f"Error searching markets for query '{query}': {e}")
            return []

    def get_tweet_markets(self):
        """
        Specifically search for markets related to Trump or Elon tweets.
        """
        queries = ["Trump tweet", "Elon tweet", "Musk tweet"]
        all_markets = []
        seen_ids = set()

        for q in queries:
            events = self.search_markets(q)
            for event in events:
                # Gamma API returns events, which contain markets.
                # We want to extract relevant markets.
                if event['id'] in seen_ids:
                    continue
                
                seen_ids.add(event['id'])
                
                # Simple filter to ensure it's about tweets
                title = event.get('title', '').lower()
                description = event.get('description', '').lower()
                
                if 'tweet' in title or 'tweet' in description:
                    all_markets.append({
                        "id": event['id'],
                        "title": event['title'],
                        "slug": event.get('slug'),
                        "markets": event.get('markets', []),
                        "volume": event.get('volume'),
                        "created_at": event.get('createdAt')
                    })
        
        return all_markets

radar_service = PolymarketRadar()
