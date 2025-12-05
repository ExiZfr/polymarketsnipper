from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import MarketFavorite
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/favorites", tags=["favorites"])

# Pydantic models
class FavoriteCreate(BaseModel):
    market_id: str
    market_title: str
    market_url: str
    priority_boost: Optional[float] = 1.5
    notes: Optional[str] = None

class FavoriteUpdate(BaseModel):
    priority_boost: Optional[float] = None
    notes: Optional[str] = None

class FavoriteResponse(BaseModel):
    id: int
    market_id: str
    market_title: str
    market_url: str
    priority_boost: float
    created_at: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True

@router.post("/", response_model=FavoriteResponse)
async def add_favorite(
    favorite: FavoriteCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a market to favorites"""
    # Check if already favorited
    existing = db.query(MarketFavorite).filter(
        MarketFavorite.market_id == favorite.market_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Market already in favorites")
    
    db_favorite = MarketFavorite(
        market_id=favorite.market_id,
        market_title=favorite.market_title,
        market_url=favorite.market_url,
        priority_boost=favorite.priority_boost,
        notes=favorite.notes
    )
    
    db.add(db_favorite)
    db.commit()
    db.refresh(db_favorite)
    
    return db_favorite

@router.delete("/{market_id}")
async def remove_favorite(
    market_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a market from favorites"""
    favorite = db.query(MarketFavorite).filter(
        MarketFavorite.market_id == market_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "Favorite removed successfully"}

@router.get("/", response_model=list[FavoriteResponse])
async def list_favorites(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all favorited markets"""
    favorites = db.query(MarketFavorite).order_by(
        MarketFavorite.created_at.desc()
    ).all()
    
    return favorites

@router.put("/{market_id}", response_model=FavoriteResponse)
async def update_favorite(
    market_id: str,
    update: FavoriteUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update favorite settings"""
    favorite = db.query(MarketFavorite).filter(
        MarketFavorite.market_id == market_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    if update.priority_boost is not None:
        favorite.priority_boost = update.priority_boost
    if update.notes is not None:
        favorite.notes = update.notes
    
    db.commit()
    db.refresh(favorite)
    
    return favorite

@router.get("/check/{market_id}")
async def check_favorite(
    market_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a market is favorited"""
    favorite = db.query(MarketFavorite).filter(
        MarketFavorite.market_id == market_id
    ).first()
    
    return {"is_favorite": favorite is not None}
