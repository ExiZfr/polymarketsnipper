from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import TrackedWallet
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Pydantic models
class WalletBase(BaseModel):
    address: str
    nickname: str | None = None

class WalletCreate(WalletBase):
    pass

class WalletUpdate(BaseModel):
    nickname: str | None = None
    is_favorite: bool | None = None
    is_copying: bool | None = None

class WalletResponse(WalletBase):
    id: int
    is_favorite: bool
    is_copying: bool
    total_profit: float
    win_rate: float
    total_trades: int
    avatar_url: str | None
    last_synced: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/wallets", response_model=List[WalletResponse])
def get_all_wallets(db: Session = Depends(get_db)):
    """Get all tracked wallets"""
    wallets = db.query(TrackedWallet).order_by(
        TrackedWallet.is_favorite.desc(),
        TrackedWallet.total_profit.desc()
    ).all()
    return wallets

@router.post("/wallets", response_model=WalletResponse)
def add_wallet(wallet: WalletCreate, db: Session = Depends(get_db)):
    """Add a new wallet to track"""
    # Check if wallet already exists
    existing = db.query(TrackedWallet).filter(TrackedWallet.address == wallet.address).first()
    if existing:
        raise HTTPException(status_code=400, detail="Wallet already tracked")
    
    # Validate address format (basic check)
    if not wallet.address.startswith('0x') or len(wallet.address) != 42:
        raise HTTPException(status_code=400, detail="Invalid wallet address format")
    
    db_wallet = TrackedWallet(
        address=wallet.address,
        nickname=wallet.nickname
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet

@router.put("/wallets/{wallet_id}", response_model=WalletResponse)
def update_wallet(wallet_id: int, wallet: WalletUpdate, db: Session = Depends(get_db)):
    """Update wallet settings"""
    db_wallet = db.query(TrackedWallet).filter(TrackedWallet.id == wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if wallet.nickname is not None:
        db_wallet.nickname = wallet.nickname
    if wallet.is_favorite is not None:
        db_wallet.is_favorite = wallet.is_favorite
    if wallet.is_copying is not None:
        db_wallet.is_copying = wallet.is_copying
    
    db_wallet.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_wallet)
    return db_wallet

@router.delete("/wallets/{wallet_id}")
def delete_wallet(wallet_id: int, db: Session = Depends(get_db)):
    """Remove a tracked wallet"""
    db_wallet = db.query(TrackedWallet).filter(TrackedWallet.id == wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    db.delete(db_wallet)
    db.commit()
    return {"message": "Wallet removed successfully"}

@router.post("/wallets/{wallet_id}/sync")
def sync_wallet(wallet_id: int, db: Session = Depends(get_db)):
    """Force sync wallet data from Polymarket"""
    db_wallet = db.query(TrackedWallet).filter(TrackedWallet.id == wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # TODO: Implement actual wallet tracking service call
    # For now, just update last_synced
    db_wallet.last_synced = datetime.utcnow()
    db.commit()
    
    return {"message": "Wallet sync started", "wallet_id": wallet_id}

@router.get("/wallets/{wallet_id}/positions")
def get_wallet_positions(wallet_id: int, db: Session = Depends(get_db)):
    """Get wallet's current positions"""
    db_wallet = db.query(TrackedWallet).filter(TrackedWallet.id == wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # TODO: Implement actual Polymarket API call
    # Placeholder response
    return {
        "wallet_id": wallet_id,
        "address": db_wallet.address,
        "positions": []
    }

@router.get("/wallets/{wallet_id}/history")
def get_wallet_history(wallet_id: int, db: Session = Depends(get_db)):
    """Get wallet's trade history"""
    db_wallet = db.query(TrackedWallet).filter(TrackedWallet.id == wallet_id).first()
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # TODO: Implement actual Polymarket API call
    # Placeholder response
    return {
        "wallet_id": wallet_id,
        "address": db_wallet.address,
        "history": []
    }
