from fastapi import APIRouter, Depends, HTTPException
from services.radar import radar_service
from routers.auth import get_current_user

router = APIRouter(
    prefix="/radar",
    tags=["radar"],
    responses={404: {"description": "Not found"}},
)

@router.get("/markets")
async def get_tweet_markets(current_user: str = Depends(get_current_user)):
    """
    Get all active markets related to Trump or Elon tweets.
    """
    try:
        markets = radar_service.get_tweet_markets()
        return markets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
