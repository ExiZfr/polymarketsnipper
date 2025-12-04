from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import dashboard, auth, settings

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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Polymarket Bot Backend Running"}
