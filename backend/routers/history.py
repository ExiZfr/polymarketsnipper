from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Trade
from routers.auth import get_current_user

router = APIRouter(
    prefix="/history",
    tags=["history"],
    responses={404: {"description": "Not found"}},
)

@router.get("/trades")
async def get_trades(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get trade history.
    """
    try:
        trades = db.query(Trade).order_by(Trade.timestamp.desc()).limit(limit).all()
        return trades
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
