"""
Quick test script to verify Polymarket Radar is working
"""
import sys
sys.path.insert(0, '/app')

from services.radar import radar_service

try:
    print("Testing Polymarket Radar...")
    print("=" * 50)
    
    # Force clear cache
    radar_service.clear_cache()
    
    # Test basic search
    print("\n1. Testing basic API search...")
    results = radar_service.search_markets("Trump", limit=5)
    print(f"   ✓ Found {len(results)} results from API")
    
    # Test political events
    print("\n2. Testing political events detection...")
    events = radar_service.get_political_events(use_cache=False)
    print(f"   ✓ Found {len(events)} political events")
    
    if events:
        print(f"\n   First 3 events:")
        for i, event in enumerate(events[:3], 1):
            print(f"   {i}. {event['title'][:80]}...")
            print(f"      Category: {event.get('category', 'N/A')}")
            print(f"      Snipe Score: {event.get('snipe_score', 0):.2f}")
            print(f"      Days Remaining: {event.get('days_remaining', 'N/A')}")
            print()
    else:
        print("   ⚠ WARNING: No events found!")
        
    print("=" * 50)
    print("Test completed successfully!")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
