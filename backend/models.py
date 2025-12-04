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
