from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkeychangeinproduction")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Simple in-memory rate limiting for Phase 1.5
# In production, use Redis for this
login_attempts = {}

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Rate Limiting Check
    client_ip = "127.0.0.1" # In real app, get from request.client.host
    now = datetime.utcnow()
    
    if client_ip in login_attempts:
        attempts, last_attempt = login_attempts[client_ip]
        if now - last_attempt < timedelta(minutes=15) and attempts >= 5:
             raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
        if now - last_attempt > timedelta(minutes=15):
            login_attempts[client_ip] = (0, now)
    
    # Simple mock auth for Phase 1 if no user exists
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Auto-create admin if not exists (FOR DEV ONLY)
    # Auto-create or reset admin (FOR DEV ONLY)
    if form_data.username == "admin" and form_data.password == "admin":
        if not user:
            user = User(username="admin", hashed_password=get_password_hash("admin"))
            db.add(user)
        else:
            # Force reset password in case it's wrong
            user.hashed_password = get_password_hash("admin")
        
        db.commit()
        db.refresh(user)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Record failed attempt
        attempts = login_attempts.get(client_ip, (0, now))[0] + 1
        login_attempts[client_ip] = (attempts, now)
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset attempts on success
    if client_ip in login_attempts:
        del login_attempts[client_ip]

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "must_change_password": user.must_change_password
    }

from pydantic import BaseModel

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange, 
    db: Session = Depends(get_db), 
    current_user: str = Depends(get_current_user)
):
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(password_data.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    user.hashed_password = get_password_hash(password_data.new_password)
    user.must_change_password = False
    db.commit()
    
    return {"message": "Password updated successfully"}
