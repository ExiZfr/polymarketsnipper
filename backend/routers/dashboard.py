from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Log, Market
from routers.auth import get_current_user

router = APIRouter()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    market_count = db.query(Market).count()
    active_markets = db.query(Market).filter(Market.status == "active").count()
    return {
        "radar_status": "ON",
        "listener_status": "ON",
        "executor_status": "OFF",
        "total_markets": market_count,
        "active_markets": active_markets
    }

@router.get("/logs")
def get_logs(limit: int = 50, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    logs = db.query(Log).order_by(Log.timestamp.desc()).limit(limit).all()
    return logs
