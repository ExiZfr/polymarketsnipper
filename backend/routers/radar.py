from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from services.radar import radar_service
from routers.auth import get_current_user
from database import get_db
from sqlalchemy.orm import Session
from models import MarketFavorite

router = APIRouter(
    prefix="/radar",
    tags=["radar"],
    responses={404: {"description": "Not found"}},
)

@router.get("/events")
async def get_political_events(
    category: Optional[str] = Query(None, description="Filter by category: tweet, speech, announcement, etc."),
    person: Optional[str] = Query(None, description="Filter by person: 'trump', 'biden', 'elon'"),
    urgency: Optional[str] = Query(None, description="Filter by urgency: critical, high, medium, low"),
    min_volume: Optional[float] = Query(None, description="Minimum volume filter"),
    min_score: Optional[float] = Query(None, description="Minimum snipe score (0-1)"),
    refresh: bool = Query(False, description="Force refresh cache"),
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all snipable political events.
    
    Query Parameters:
    - category: Filter by event type (tweet, speech, announcement, interview, etc.)
    - person: Filter by person name
    - urgency: Filter by urgency level (critical, high, medium, low)
    - min_volume: Only return events with volume >= this value
    - min_score: Only return events with snipe_score >= this value
    - refresh: Force refresh the cache
    """
    try:
        # Force refresh if requested
        if refresh:
            radar_service.clear_cache()
        
        # Get base events
        if person:
            events = radar_service.get_markets_by_person(person)
        elif category:
            events = radar_service.get_events_by_category(category)
        elif urgency:
            events = radar_service.get_urgent_events(urgency)
        else:
            events = radar_service.get_political_events(use_cache=not refresh)
        
        # Apply additional filters
        if min_volume is not None:
            events = [e for e in events if e.get('volume', 0) >= min_volume]
        
        if min_score is not None:
            events = [e for e in events if e.get('snipe_score', 0) >= min_score]
        
        # Load favorites and mark events
        favorites = db.query(MarketFavorite).all()
        favorite_ids = {f.market_id for f in favorites}
        
        for event in events:
            event['is_favorite'] = event.get('id') in favorite_ids
        
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets")
async def get_tweet_markets(
    person: Optional[str] = Query(None, description="Filter by person: 'trump' or 'elon'"),
    min_volume: Optional[float] = Query(None, description="Minimum volume filter"),
    refresh: bool = Query(False, description="Force refresh cache"),
    current_user: str = Depends(get_current_user)
):
    """
    Legacy endpoint - Get tweet-only markets.
    
    Query Parameters:
    - person: Filter by 'trump' or 'elon'
    - min_volume: Only return markets with volume >= this value
    - refresh: Force refresh the cache
    """
    try:
        # Force refresh if requested
        if refresh:
            radar_service.clear_cache()
        
        # Get markets
        if person:
            markets = radar_service.get_markets_by_person(person)
            # Filter to tweets only
            markets = [m for m in markets if m.get('category') == 'tweet']
        else:
            markets = radar_service.get_tweet_markets(use_cache=not refresh)
        
        # Apply volume filter if specified
        if min_volume is not None:
            markets = [m for m in markets if m.get('volume', 0) >= min_volume]
        
        return markets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_radar_stats(current_user: str = Depends(get_current_user)):
    """
    Get statistics about detected events.
    """
    try:
        events = radar_service.get_political_events()
        
        # Count by category
        categories = {}
        urgencies = {}
        persons = {}
        
        for event in events:
            cat = event.get('category', 'other')
            categories[cat] = categories.get(cat, 0) + 1
            
            urg = event.get('urgency', 'unknown')
            urgencies[urg] = urgencies.get(urg, 0) + 1
            
            for person in event.get('persons', []):
                persons[person] = persons.get(person, 0) + 1
        
        # Average snipe score
        avg_score = sum(e.get('snipe_score', 0) for e in events) / len(events) if events else 0
        
        return {
            "total_events": len(events),
            "by_category": categories,
            "by_urgency": urgencies,
            "by_person": persons,
            "avg_snipe_score": round(avg_score, 2),
            "cache_valid": radar_service._is_cache_valid()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cache/clear")
async def clear_cache(current_user: str = Depends(get_current_user)):
    """
    Manually clear the market cache.
    """
    try:
        radar_service.clear_cache()
        return {"status": "success", "message": "Cache cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """
    Check if the radar service is operational.
    """
    try:
        # Try a simple search
        results = radar_service.search_markets("test", limit=1)
        return {
            "status": "healthy",
            "api_reachable": True,
            "cache_valid": radar_service._is_cache_valid()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "api_reachable": False
        }
