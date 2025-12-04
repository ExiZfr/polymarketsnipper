from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from database import get_db
from models import User
from auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from pydantic import BaseModel

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login endpoint that returns a JWT token"""
    # Find user
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Verify user and password
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def read_users_me(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user.username,
        "role": user.role,
        "last_login": user.last_login,
        "must_change_password": user.must_change_password
    }
