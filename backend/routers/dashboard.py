from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Log, Market
from routers.auth import get_current_user
from services.radar import radar_service
from datetime import datetime
from typing import Optional

router = APIRouter()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Get real stats from radar service
    events = radar_service.get_political_events()
    active_events = [e for e in events if e.get('days_remaining', 0) is not None and e.get('days_remaining', 0) >= 0]
    
    # Calculate total volume tracked
    total_volume = sum(e.get('volume', 0) for e in events)
    
    # Determine system status based on cache validity
    radar_status = "ON" if radar_service._is_cache_valid() else "SCANNING"
    
    return {
        "radar_status": radar_status,
        "listener_status": "ON", # Placeholder for now
        "executor_status": "OFF", # Placeholder for now
        "total_markets": len(events),
        "active_markets": len(active_events),
        "total_volume": total_volume,
        "last_updated": datetime.now().isoformat()
    }

@router.get("/logs")
def get_logs(
    limit: int = 50, 
    module: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    query = db.query(Log)
    
    if module:
        query = query.filter(Log.module == module)
        
    logs = query.order_by(Log.timestamp.desc()).limit(limit).all()
    return logs
