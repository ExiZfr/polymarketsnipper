#!/usr/bin/env python3
"""Complete system test"""
import sys
sys.path.insert(0, '/app')

from services.radar import radar_service
from database import SessionLocal
from models import Setting, Log
import requests

print("=" * 60)
print("🔍 POLYMARKET BOT - COMPLETE SYSTEM TEST")
print("=" * 60)

# Test 1: Database Connection
print("\n[1] Testing Database Connection...")
try:
    db = SessionLocal()
    settings_count = db.query(Setting).count()
    logs_count = db.query(Log).count()
    print(f"    ✓ Database OK")
    print(f"    ├─ Settings: {settings_count}")
    print(f"    └─ Logs: {logs_count}")
    db.close()
except Exception as e:
    print(f"    ❌ Database Error: {e}")

# Test 2: Polymarket API
print("\n[2] Testing Polymarket API...")
try:
    resp = requests.get("https://gamma-api.polymarket.com/events?limit=5", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        print(f"    ✓ Polymarket API OK")
        print(f"    └─ Received {len(data)} events")
    else:
        print(f"    ❌ Polymarket API Error: {resp.status_code}")
except Exception as e:
    print(f"    ❌ API Connection Error: {e}")

# Test 3: Radar Service
print("\n[3] Testing Radar Service...")
try:
    radar_service.clear_cache()
    events = radar_service.get_political_events()
    print(f"    ✓ Radar Service OK")
    print(f"    └─ Detected {len(events)} snipable markets")
    
    if events:
        print(f"\n    📊 Top 3 Markets by Snipe Score:")
        for i, e in enumerate(events[:3], 1):
            print(f"    {i}. {e['title'][:70]}")
            print(f"       Score: {e.get('snipe_score', 0):.2f} | Category: {e.get('category', 'N/A')}")
    else:
        print("\n    ⚠️  WARNING: No markets detected!")
        print("    This could mean:")
        print("    - Polymarket API is blocking requests")
        print("    - No markets match search criteria")
        print("    - Network connectivity issue")
        
except Exception as e:
    print(f"    ❌ Radar Error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Listener Service
print("\n[4] Testing Listener Service...")
try:
    from services.listener import listener_service
    print(f"    ✓ Listener imported")
    print(f"    ├─ Status: {'Running' if listener_service.is_running else 'Stopped'}")
    print(f"    └─ Targets: {len(listener_service.targets)}")
except Exception as e:
    print(f"    ❌ Listener Error: {e}")

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
