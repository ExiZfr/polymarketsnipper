from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="admin")
    last_login = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=True)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    category = Column(String) # api, trading, system
    description = Column(String, nullable=True)

class Market(Base):
    __tablename__ = "markets"
    id = Column(Integer, primary_key=True, index=True)
    polymarket_id = Column(String, unique=True, index=True)
    question = Column(String)
    url = Column(String)
    status = Column(String, default="active") # active, ignored, expired
    created_at = Column(DateTime, default=datetime.utcnow)

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String) # Radar, Listener, Executor
    level = Column(String) # INFO, ERROR, WARNING
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String, index=True) # Polymarket ID
    market_title = Column(String)
    side = Column(String) # BUY or SELL
    outcome = Column(String) # YES or NO
    amount = Column(Float)
    price = Column(Float)
    status = Column(String) # FILLED, PENDING, FAILED
    timestamp = Column(DateTime, default=datetime.utcnow)
    trigger_event = Column(String, nullable=True) # What triggered this trade

class ActivitySnapshot(Base):
    """Track hourly activity stats for dashboard charts"""
    __tablename__ = "activity_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    events_detected = Column(Integer, default=0)  # Markets from radar
    trades_executed = Column(Integer, default=0)  # Trades completed
    active_targets = Column(Integer, default=0)   # Active monitoring targets

class PaperTrade(Base):
    """Track paper trades for algorithm validation"""
    __tablename__ = "paper_trades"
    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String, index=True)
    market_title = Column(String)
    side = Column(String)  # YES or NO
    size = Column(Float)  # Position size in USD
    confidence = Column(Float)  # Overall confidence score
    signal_quality = Column(Float)  # Signal quality score
    market_quality = Column(Float)  # Market quality score
    signal_source = Column(String)  # twitter, rss
    signal_content = Column(String, nullable=True)  # What was detected
    status = Column(String, default='OPEN')  # OPEN, CLOSED, EXPIRED
    outcome = Column(String, nullable=True)  # WIN, LOSS (when closed)
    payout = Column(Float, nullable=True)  # Payout when closed
    profit = Column(Float, nullable=True)  # P&L when closed
    opened_at = Column(DateTime, default=datetime.utcnow, index=True)
    closed_at = Column(DateTime, nullable=True)

class MarketFavorite(Base):
    """Track user's favorite markets for prioritized monitoring"""
    __tablename__ = "market_favorites"
    id = Column(Integer, primary_key=True, index=True)
    market_id = Column(String, unique=True, index=True)  # Polymarket ID
    market_title = Column(String)
    market_url = Column(String)
    priority_boost = Column(Float, default=1.5)  # Multiplier for listener priority
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)  # User notes about why favorited

class TrackedWallet(Base):
    `"`"Track Polymarket wallets for copy trading`"`"
    __tablename__ = 'tracked_wallets'
    id = Column(Integer, primary_key=True, index=True)
    address = Column(String(42), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=True)
    is_favorite = Column(Boolean, default=False, index=True)
    is_copying = Column(Boolean, default=False, index=True)
    total_profit = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    avatar_url = Column(Text, nullable=True)
    last_synced = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
