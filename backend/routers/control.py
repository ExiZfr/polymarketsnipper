from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from services.listener import listener_service
from services.radar import radar_service
from database import SessionLocal
from models import Log
from datetime import datetime

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
        # Just log it - radar runs on cache cycle
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
    """Start the trade executor (placeholder)"""
    db = SessionLocal()
    log = Log(
        module="Executor",
        level="INFO",
        message="⚡ Trade Executor activated - Ready to execute orders"
    )
    db.add(log) 
    db.commit()
    db.close()
    
    return {"status": "started", "message": "Executor is not yet implemented"}

@router.post("/executor/stop")
async def stop_executor(current_user: str = Depends(get_current_user)):
    """Stop the trade executor (placeholder)"""
    db = SessionLocal()
    log = Log(
        module="Executor",
        level="WARNING",
        message="⏸️ Trade Executor paused"
    )
    db.add(log)
    db.commit()
    db.close()
    
    return {"status": "stopped"}
