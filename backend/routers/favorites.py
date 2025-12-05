"""
Favorites router - Manage user's favorite markets
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import Favorite, User
from auth import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])

class FavoriteCreate(BaseModel):
    market_id: str
    market_title: str
    market_url: str = None
    snipe_score: float = None
    urgency_rate: int = None

class FavoriteResponse(BaseModel):
    id: int
    market_id: str
    market_title: str
    market_url: str = None
    snipe_score: float = None
    urgency_rate: int = None
    created_at: str
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[FavoriteResponse])
def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all favorites for current user"""
    favorites = db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
    return favorites

@router.post("/", response_model=FavoriteResponse)
def add_favorite(
    favorite: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a market to favorites"""
    # Check if already favorited
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.market_id == favorite.market_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Market already in favorites")
    
    # Create new favorite
    new_favorite = Favorite(
        user_id=current_user.id,
        market_id=favorite.market_id,
        market_title=favorite.market_title,
        market_url=favorite.market_url,
        snipe_score=favorite.snipe_score,
        urgency_rate=favorite.urgency_rate
    )
    
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    
    return new_favorite

@router.delete("/{market_id}")
def remove_favorite(
    market_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a market from favorites"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.market_id == market_id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    db.delete(favorite)
    db.commit()
    
    return {"message": "Favorite removed successfully"}

@router.get("/check/{market_id}")
def check_favorite(
    market_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a market is favorited"""
    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.market_id == market_id
    ).first()
    
    return {"is_favorite": favorite is not None}
