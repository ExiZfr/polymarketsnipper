from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import dashboard, auth, settings, radar, history, control
from services.listener import listener_service

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Polymarket Bot API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])
app.include_router(radar.router)
app.include_router(history.router)
app.include_router(control.router)

@app.on_event("startup")
async def startup_event():
    """Start background services."""
    listener_service.start()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background services."""
    listener_service.stop()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Polymarket Bot Backend Running"}
