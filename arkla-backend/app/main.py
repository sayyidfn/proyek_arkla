import os
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.core.database import init_database
from app.core.config import settings
from app.routes import process, surat, export, master_data

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ARKLA Backend...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    # Create required directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    os.makedirs("database", exist_ok=True)
    
    # Initialize database
    try:
        init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    
    # Verify Gemini API key
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("⚠️ GOOGLE_API_KEY not set! Gemini features will not work.")
    else:
        logger.info("✅ Gemini API key configured")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ARKLA Backend...")


# Create FastAPI app
app = FastAPI(
    title="ARKLA API",
    description="Document Processing System for DPRD Sleman",
    version="1.0.0",
    lifespan=lifespan
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again.",
            "detail": str(exc) if os.getenv("ENVIRONMENT") != "production" else None
        }
    )


# CORS middleware - must be before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(process.router, prefix="/api/v1", tags=["Process"])
app.include_router(surat.router, prefix="/api/v1", tags=["Surat"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(master_data.router, prefix="/api/v1", tags=["Master Data"])


@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "ARKLA Backend",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers"""
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "database": "connected",
        "version": "1.0.0"
    }

