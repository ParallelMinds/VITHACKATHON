"""
RED QUEEN — Cargo Intelligence API
Main FastAPI application entry point
"""

from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import MODEL_PATH
from database import init_db
from services.detection import DetectionService
from routers import inspect, vessels, auth, ships, ai, report

# Create FastAPI app
app = FastAPI(
    title="RED QUEEN — Cargo Intelligence API",
    description="AI-powered cargo inspection system for customs and border security",
    version="1.0.0"
)

# Add CORS middleware - allow all origins, methods, headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inspect.router, prefix="/api")
app.include_router(vessels.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ships.router, prefix="/api/ships", tags=["Ship Tracking"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Analysis"])
app.include_router(report.router, tags=["Report Generation"])

# Global model reference
model_service = None


@app.on_event("startup")
async def startup_event():
    """Initialize database and load YOLO model on startup."""
    print("[RED QUEEN] Starting up...")
    
    # Initialize database
    init_db()
    print("[RED QUEEN] Database initialized")
    
    # Load YOLO model
    global model_service
    model_service = DetectionService()
    print("[RED QUEEN] Model loading complete")


@app.get("/")
async def root():
    """Root endpoint returning API name and version."""
    return {
        "name": "RED QUEEN — Cargo Intelligence API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint returning system status."""
    model_loaded = model_service is not None and not model_service.mock_mode
    
    return {
        "status": "online",
        "model_loaded": model_loaded,
        "model_path": MODEL_PATH,
        "timestamp": datetime.utcnow().isoformat()
    }
