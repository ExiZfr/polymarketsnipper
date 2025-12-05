from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from services.listener import listener_service
from services.radar import radar_service
from database import SessionLocal
from models import Log
from datetime import datetime

# Import module states from dashboard
import routers.dashboard as dashboard_module

router = APIRouter(
    prefix="/control",
    tags=["control"],
)

@router.post("/radar/start")
async def start_radar(current_user: str = Depends(get_current_user)):
    """Start the radar scanning service"""
    try:
        # Force refresh cache to trigger immediate scan
        radar_service.clear_cache()
        radar_service.get_political_events(use_cache=False)
        
        # Update state
        dashboard_module.module_states['radar'] = True
        
        # Log the action
        db = SessionLocal()
        log = Log(
            module="Radar",
            level="INFO",
            message="🎯 Market Radar manually activated - Starting fresh scan..."
        )
        db.add(log)
        db.commit()
        db.close()
        
        return {"status": "started", "message": "Radar is now scanning"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/radar/stop")
async def stop_radar(current_user: str = Depends(get_current_user)):
    """Stop the radar scanning service"""
    try:
        # Update state
        dashboard_module.module_states['radar'] = False
        
        # Log the action
        db = SessionLocal()
        log = Log(
            module="Radar",
            level="WARNING",
            message="⏸️ Market Radar manually paused"
        )
        db.add(log)
        db.commit()
        db.close()
        
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/listener/start")
async def start_listener(current_user: str = Depends(get_current_user)):
    """Start the social listener service"""
    try:
        if not listener_service.is_running:
            listener_service.start()
            
            # Update state
            dashboard_module.module_states['listener'] = True
            
            db = SessionLocal()
            log = Log(
                module="Listener",
                level="INFO",
                message="🎧 Social Listener manually activated - Now monitoring Twitter & News"
            )
            db.add(log)
            db.commit()
            db.close()
            
        return {"status": "started", "is_running": listener_service.is_running}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/listener/stop")
async def stop_listener(current_user: str = Depends(get_current_user)):
    """Stop the social listener service"""
    try:
        if listener_service.is_running:
            listener_service.stop()
            
            # Update state
            dashboard_module.module_states['listener'] = False
            
            db = SessionLocal()
            log = Log(
                module="Listener",
                level="WARNING",
                message="⏸️ Social Listener manually paused"
            )
            db.add(log)
            db.commit()
            db.close()
            
        return {"status": "stopped", "is_running": listener_service.is_running}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executor/start")
async def start_executor(current_user: str = Depends(get_current_user)):
    """Start the trade executor (paper trading)"""
    try:
        # Update state
        dashboard_module.module_states['executor'] = True
        
        db = SessionLocal()
        log = Log(
            module="Executor",
            level="INFO",
            message="⚡ Paper Trading Executor activated - Monitoring for trade signals"
        )
        db.add(log) 
        db.commit()
        db.close()
        
        return {"status": "started", "mode": "paper_trading"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executor/stop")
async def stop_executor(current_user: str = Depends(get_current_user)):
    """Stop the trade executor"""
    try:
        # Update state
        dashboard_module.module_states['executor'] = False
        
        db = SessionLocal()
        log = Log(
            module="Executor",
            level="WARNING",
            message="⏸️ Paper Trading Executor paused"
        )
        db.add(log)
        db.commit()
        db.close()
        
        return {"status": "stopped"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_module_status(current_user: str = Depends(get_current_user)):
    """Get current status of all modules"""
    return {
        "radar": "ON" if dashboard_module.module_states['radar'] else "OFF",
        "listener": "ON" if listener_service.is_running else "OFF",
        "executor": "ON" if dashboard_module.module_states['executor'] else "OFF"
    }
