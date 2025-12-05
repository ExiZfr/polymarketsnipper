from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Log, Market, ActivitySnapshot, Trade
from routers.auth import get_current_user
from services.radar import radar_service
from services.listener import listener_service
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

# Global state for modules (in-memory)
module_states = {
    'radar': True,  # Always on (passive service)
    'listener': False,  # Controlled
    'executor': False  # Controlled
}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # Get real stats from radar service
    events = radar_service.get_political_events() if module_states['radar'] else []
    active_events = [e for e in events if e.get('days_remaining', 0) is not None and e.get('days_remaining', 0) >= 0]
    
    # Calculate total volume tracked
    total_volume = sum(e.get('volume', 0) for e in events)
    
    # Get trades count (paper trades)
    from models import PaperTrade
    trades_today = db.query(PaperTrade).filter(
        PaperTrade.opened_at >= datetime.utcnow() - timedelta(days=1)
    ).count()
    
    # Get real status from services
    listener_status = "ON" if listener_service.is_running else "OFF"
    radar_status = "ON" if module_states['radar'] else "OFF"
    executor_status = "ON" if module_states['executor'] else "OFF"
    
    return {
        "radar_status": radar_status,
        "listener_status": listener_status,
        "executor_status": executor_status,
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
    
    return [
        {
            "id": log.id,
            "module": log.module,
            "level": log.level,
            "message": log.message,
            "timestamp": log.timestamp.isoformat()
        }
        for log in logs
    ]

@router.get("/activity_chart")
def get_activity_chart(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get activity data for charts (last N hours).
    Returns hourly aggregated data.
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    # Try to get from ActivitySnapshot first
    snapshots = db.query(ActivitySnapshot).filter(
        ActivitySnapshot.timestamp >= cutoff_time
    ).order_by(ActivitySnapshot.timestamp.asc()).all()
    
    if snapshots:
        # Use existing snapshots
        result = []
        for snap in snapshots:
            result.append({
                "time": snap.timestamp.strftime("%H:%M"),
                "events": snap.events_detected,
                "trades": snap.trades_executed,
                "targets": snap.active_targets
            })
        return result
    
    # Fallback: generate synthetic data based on current state
    result = []
    current_time = datetime.utcnow()
    
    for i in range(hours):
        time = current_time - timedelta(hours=hours-i-1)
        
        # Count events detected around this time
        events_count = len(radar_service.get_political_events()) if i == hours-1 else 0
        
        # Count trades in this hour
        from models import PaperTrade
        trades_count = db.query(PaperTrade).filter(
            func.date_trunc('hour', PaperTrade.opened_at) == func.date_trunc('hour', time)
        ).count()
        
        result.append({
            "time": time.strftime("%H:%M"),
            "events": events_count,
            "trades": trades_count,
            "targets": len(listener_service.targets) if i == hours-1 else 0
        })
    
    return result
