from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Setting
from auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class SettingUpdate(BaseModel):
    key: str
    value: str
    category: str
    description: Optional[str] = None

@router.get("/")
def get_settings(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Setting).all()

@router.post("/")
def update_setting(setting: SettingUpdate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    db_setting = db.query(Setting).filter(Setting.key == setting.key).first()
    if db_setting:
        db_setting.value = setting.value
        db_setting.category = setting.category
        if setting.description:
            db_setting.description = setting.description
    else:
        new_setting = Setting(
            key=setting.key, 
            value=setting.value, 
            category=setting.category,
            description=setting.description
        )
        db.add(new_setting)
    
    db.commit()
    return {"status": "updated", "key": setting.key}

@router.post("/bulk")
def bulk_update_settings(settings: List[SettingUpdate], db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    for s in settings:
        update_setting(s, db, current_user)
    return {"status": "bulk_updated"}
