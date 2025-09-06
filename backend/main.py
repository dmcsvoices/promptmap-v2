"""
PromptMap V2 - FastAPI Backend Main Application
Skeleton implementation with database connection test
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env")

from database.connection import init_db, get_db_session, test_connection
from api import sessions, tests, models, config, prompts, results

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    logger.info("🚀 Starting PromptMap V2...")
    
    # Test database connection
    logger.info("Testing database connection...")
    connection_ok = await test_connection()
    if not connection_ok:
        logger.error("❌ Database connection failed!")
        raise Exception("Database connection failed")
    
    logger.info("✅ Database connection successful")
    
    # Initialize database
    logger.info("Initializing database...")
    await init_db()
    logger.info("✅ Database initialized")
    
    yield
    
    logger.info("🛑 Shutting down PromptMap V2...")


# Create FastAPI app
app = FastAPI(
    title="PromptMap V2",
    description="Advanced Prompt Injection Testing Framework - Version 2",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    """Welcome endpoint with system info"""
    return {
        "message": "Welcome to PromptMap V2 🚀",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "FastAPI Backend",
            "React Frontend", 
            "PostgreSQL + pgvector",
            "Real-time testing",
            "Modern UI"
        ]
    }


@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    try:
        # Test database connection
        db_healthy = await test_connection()
        
        return {
            "status": "healthy" if db_healthy else "degraded",
            "service": "promptmap-v2",
            "version": "2.0.0",
            "database": "connected" if db_healthy else "disconnected",
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@app.get("/api/test-db")
async def test_database():
    """Test database connection endpoint"""
    try:
        connection_ok = await test_connection()
        if connection_ok:
            return {
                "status": "success",
                "message": "Database connection is working!",
                "database": os.getenv("DB_NAME", "promptmap_v2")
            }
        else:
            raise HTTPException(status_code=503, detail="Database connection failed")
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        raise HTTPException(status_code=503, detail=str(e))


# Include API routers
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(tests.router, prefix="/api/tests", tags=["Tests"])  
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(config.router, prefix="/api/config", tags=["Config"])
app.include_router(prompts.router, prefix="/api/prompts", tags=["Prompts"])
app.include_router(results.router, prefix="/api/results", tags=["Results"])


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    logger.info(f"🚀 Starting server on {host}:{port} (debug={debug})")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )