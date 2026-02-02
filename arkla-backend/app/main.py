"""
ARKLA Backend - Document Processing System for DPRD Sleman
FastAPI application with Google Gemini AI integration for OCR and data extraction.
"""

import os
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.core.database import init_database
from app.core.config import settings
from app.routes import process, surat, export, master_data

# Load environment variables
load_dotenv()

# Configure logging based on environment
log_level = logging.DEBUG if os.getenv("ENVIRONMENT") == "development" else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    logger.info("=" * 50)
    logger.info("Starting ARKLA Backend v1.0.0")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info("=" * 50)
    
    # Create required directories
    for directory in ["uploads", "output", "database"]:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize database
    try:
        init_database()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    
    # Verify Gemini API key
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("⚠️  GOOGLE_API_KEY not set! OCR features will not work.")
    else:
        logger.info("✅ Gemini API key configured")
    
    logger.info("🚀 ARKLA Backend ready to serve requests")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ARKLA Backend...")


# Create FastAPI app
app = FastAPI(
    title="ARKLA API",
    description="Document Processing System for DPRD Kabupaten Sleman",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions gracefully."""
    logger.error(f"Unhandled exception on {request.url}: {exc}\n{traceback.format_exc()}")
    
    is_production = os.getenv("ENVIRONMENT") == "production"
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Terjadi kesalahan server. Silakan coba lagi.",
            "detail": None if is_production else str(exc)
        }
    )


# Middleware stack (order matters - first added = last executed)
# GZip compression for responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS - Allow all origins for flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # For file downloads
)

# Include routers
app.include_router(process.router, prefix="/api/v1", tags=["Process"])
app.include_router(surat.router, prefix="/api/v1", tags=["Surat"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(master_data.router, prefix="/api/v1", tags=["Master Data"])


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - basic service info."""
    return {
        "status": "healthy",
        "service": "ARKLA Backend",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GOOGLE_API_KEY")),
        "database": "connected",
        "version": "1.0.0"
    }


