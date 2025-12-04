from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from services.radar import radar_service
from routers.auth import get_current_user

router = APIRouter(
    prefix="/radar",
    tags=["radar"],
    responses={404: {"description": "Not found"}},
)

@router.get("/markets")
async def get_tweet_markets(
    person: Optional[str] = Query(None, description="Filter by person: 'trump' or 'elon'"),
    min_volume: Optional[float] = Query(None, description="Minimum volume filter"),
    refresh: bool = Query(False, description="Force refresh cache"),
    current_user: str = Depends(get_current_user)
):
    """
    Get all active markets related to Trump or Elon tweets.
    
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
        else:
            markets = radar_service.get_tweet_markets(use_cache=not refresh)
        
        # Apply volume filter if specified
        if min_volume is not None:
            markets = [m for m in markets if m.get('volume', 0) >= min_volume]
        
        return markets
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
