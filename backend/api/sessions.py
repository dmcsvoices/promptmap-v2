"""
Sessions API endpoints for PromptMap V2
Skeleton implementation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from database.connection import get_db_session
from models.session import SessionModel

router = APIRouter()


class CreateSessionRequest(BaseModel):
    name: str
    model: str
    model_type: str
    iterations: Optional[int] = 5
    severities: Optional[List[str]] = ["low", "medium", "high"]
    notes: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    model_type: Optional[str] = None
    iterations: Optional[int] = None
    severities: Optional[List[str]] = None
    notes: Optional[str] = None


@router.get("/")
async def list_sessions(db: AsyncSession = Depends(get_db_session)):
    """Get all sessions"""
    try:
        result = await db.execute(select(SessionModel).order_by(SessionModel.created_at.desc()))
        sessions = result.scalars().all()
        return {
            "sessions": [session.to_dict() for session in sessions],
            "total": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")


@router.post("/")
async def create_session(
    session_data: CreateSessionRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new session"""
    try:
        new_session = SessionModel(
            name=session_data.name,
            model=session_data.model,
            model_type=session_data.model_type,
            iterations=session_data.iterations,
            severities=session_data.severities,
            notes=session_data.notes,
            status="pending"
        )
        
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        
        return {
            "message": "Session created successfully",
            "session": new_session.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.put("/{session_id}")
async def update_session(
    session_id: int,
    session_data: UpdateSessionRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Update an existing session"""
    try:
        result = await db.execute(select(SessionModel).where(SessionModel.id == session_id))
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session with id {session_id} not found")
        
        # Update only provided fields
        if session_data.name is not None:
            session.name = session_data.name
        if session_data.model is not None:
            session.model = session_data.model
        if session_data.model_type is not None:
            session.model_type = session_data.model_type
        if session_data.iterations is not None:
            session.iterations = session_data.iterations
        if session_data.severities is not None:
            session.severities = session_data.severities
        if session_data.notes is not None:
            session.notes = session_data.notes
        
        await db.commit()
        await db.refresh(session)
        
        return {
            "message": "Session updated successfully",
            "session": session.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


@router.get("/test")
async def test_sessions_endpoint():
    """Test endpoint for sessions"""
    return {
        "message": "Sessions API is working!",
        "endpoints": [
            "GET /api/sessions/ - List all sessions",
            "POST /api/sessions/ - Create new session",
            "PUT /api/sessions/{session_id} - Update session",
            "GET /api/sessions/test - This test endpoint"
        ]
    }