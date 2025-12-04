import sys
import os

# Add the current directory to sys.path so we can import from services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.radar import radar_service

def test_radar():
    print("Testing Market Radar...")
    try:
        markets = radar_service.get_tweet_markets()
        print(f"Found {len(markets)} markets related to Trump/Elon tweets.")
        for market in markets[:5]:
            print(f"- [{market['id']}] {market['title']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_radar()
