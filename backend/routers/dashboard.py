from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Log, Market, ActivitySnapshot, Trade
from routers.auth import get_current_user
from services.radar import radar_service
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Get real stats from radar service
    events = radar_service.get_political_events()
    active_events = [e for e in events if e.get('days_remaining', 0) is not None and e.get('days_remaining', 0) >= 0]
    
    # Calculate total volume tracked
    total_volume = sum(e.get('volume', 0) for e in events)
    
    # Get trades count
    trades_today = db.query(Trade).filter(
        Trade.timestamp >= datetime.utcnow() - timedelta(days=1)
    ).count()
    
    # Determine system status based on cache validity
    radar_status = "ON" if radar_service._is_cache_valid() else "SCANNING"
    
    return {
        "radar_status": radar_status,
        "listener_status": "ON",
        "executor_status": "OFF",
        "total_markets": len(events),
        "active_markets": len(active_events),
        "total_volume": total_volume,
        "trades_today": trades_today,
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

@router.get("/activity_chart")
def get_activity_chart(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get activity data for the last N hours for dashboard chart.
    Returns events detected and trades executed per hour.
    """
    # Get data from the last N hours
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Group trades by hour
    trades_by_hour = db.query(
        func.strftime('%Y-%m-%d %H:00:00', Trade.timestamp).label('hour'),
        func.count(Trade.id).label('count')
    ).filter(
        Trade.timestamp >= since
    ).group_by('hour').all()
    
    # Group logs (INFO level = events detected) by hour
    events_by_hour = db.query(
        func.strftime('%Y-%m-%d %H:00:00', Log.timestamp).label('hour'),
        func.count(Log.id).label('count')
    ).filter(
        Log.timestamp >= since,
        Log.module == 'Listener',
        Log.level == 'INFO'
    ).group_by('hour').all()
    
    # Create hourly buckets
    result = []
    for i in range(hours):
        hour_time = datetime.utcnow() - timedelta(hours=hours-i-1)
        hour_str = hour_time.strftime('%Y-%m-%d %H:00:00')
        
        # Find matching data
        trades_count = next((t.count for t in trades_by_hour if t.hour == hour_str), 0)
        events_count = next((e.count for e in events_by_hour if e.hour == hour_str), 0)
        
        result.append({
            'time': hour_time.strftime('%H:%M'),
            'events': events_count,
            'trades': trades_count
        })
    
    return result
