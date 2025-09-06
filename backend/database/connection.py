"""
Database connection and initialization for PromptMap V2
Using SQLAlchemy 2.0 with async support
"""

import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env")  # Fixed path to .env file

logger = logging.getLogger(__name__)

# Build database URL from environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "promptmap_web")
DB_USER = os.getenv("DB_USER", "promptmap_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Convert to async URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

logger.info(f"Database URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'masked'}")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DEBUG", "false").lower() == "true",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create session maker
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Base class for models
class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    try:
        async with engine.begin() as conn:
            # Import all models to register them
            from models.session import SessionModel
            from models.test_rule import TestRuleModel  
            from models.test_result import TestResultModel
            from models.system_prompt import SystemPromptModel
            from models.configuration import ConfigurationModel
            
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            
            logger.info("✅ Database tables initialized")
            
            # Create pgvector extension if not exists
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("✅ pgvector extension enabled")
            
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise


async def test_connection() -> bool:
    """Test database connection"""
    try:
        async with AsyncSessionLocal() as session:
            # Test basic connection
            result = await session.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            if test_value == 1:
                logger.info("✅ Database connection test successful")
                return True
            else:
                logger.error("❌ Database connection test failed")
                return False
                
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return False


async def close_db():
    """Close database connections"""
    await engine.dispose()
    logger.info("✅ Database connections closed")