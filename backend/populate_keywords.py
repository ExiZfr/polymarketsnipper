"""
Populate Settings with Default Keywords for Listener
Run once to initialize the database with high-value keywords
"""
import sys
sys.path.append('/app')

from database import SessionLocal
from models import Setting

# 50 High-Value Keywords for Sniping
KEYWORDS = [
    # Tech Companies (10)
    "spacex", "tesla", "nvidia", "apple", "microsoft",
    "google", "meta", "amazon", "openai", "anthropic",
    
    # Space & Science (5)
    "nasa", "launch", "rocket", "mars", "moon",
    
    # Crypto (10)
    "bitcoin", "ethereum", "crypto", "btc", "eth",
    "blockchain", "nft", "coinbase", "binance", "sec",
    
    # Political Figures (8)
    "trump", "biden", "elon", "musk", "desantis",
    "harris", "obama", "putin",
    
    # Political Events (7)
    "election", "debate", "rally", "impeach", "resign",
    "congress", "senate",
    
    # Economic Terms (10)
    "fed", "interest rate", "inflation", "recession", "gdp",
    "unemployment", "stock market", "dow", "nasdaq", "sp500",
    
    # Action Words - High Signal (10)
    "announce", "tweet", "confirm", "deny", "resign",
    "appoint", "fire", "acquire", "merger", "ipo",
    
    # Bonus High-Impact (10)
    "war", "invasion", "ceasefire", "nuclear", "sanctions",
    "ai", "chatgpt", "cure", "vaccine", "pandemic"
]

def populate_keywords():
    """Populate settings with keyword list"""
    db = SessionLocal()
    
    try:
        # Check if keywords already exist
        existing = db.query(Setting).filter(Setting.key == "listener_keywords").first()
        
        if existing:
            print(f"⚠️ Keywords already exist in database")
            print(f"Current value: {existing.value[:100]}...")
            response = input("Do you want to update them? (y/n): ")
            if response.lower() != 'y':
                print("Skipping update")
                return
            
            # Update existing
            existing.value = ",".join(KEYWORDS)
            print(f"✅ Updated {len(KEYWORDS)} keywords")
        else:
            # Create new setting
            setting = Setting(
                key="listener_keywords",
                value=",".join(KEYWORDS),
                category="listener",
                description="High-value keywords that listener always searches for in tweets and news"
            )
            db.add(setting)
            print(f"✅ Added {len(KEYWORDS)} keywords to database")
        
        db.commit()
        
        # Display keywords by category
        print("\n📋 Keywords by Category:")
        print("\n🚀 Tech Companies:")
        print("   ", ", ".join(KEYWORDS[0:10]))
        print("\n🌌 Space & Science:")
        print("   ", ", ".join(KEYWORDS[10:15]))
        print("\n💰 Crypto:")
        print("   ", ", ".join(KEYWORDS[15:25]))
        print("\n👤 Political Figures:")
        print("   ", ", ".join(KEYWORDS[25:33]))
        print("\n🏛️ Political Events:")
        print("   ", ", ".join(KEYWORDS[33:40]))
        print("\n📊 Economic Terms:")
        print("   ", ", ".join(KEYWORDS[40:50]))
        print("\n⚡ Action Words:")
        print("   ", ", ".join(KEYWORDS[50:60]))
        print("\n🔥 High-Impact:")
        print("   ", ", ".join(KEYWORDS[60:70]))
        
        print(f"\n✅ Total: {len(KEYWORDS)} keywords configured")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Populating listener keywords...")
    populate_keywords()
