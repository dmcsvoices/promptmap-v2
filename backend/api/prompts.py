"""
System Prompts API endpoints for PromptMap V2
Handles system prompt management tied to sessions
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from database.connection import get_db_session
from models.system_prompt import SystemPromptModel

router = APIRouter()


class CreatePromptRequest(BaseModel):
    session_id: int
    content: str


class UpdatePromptRequest(BaseModel):
    content: str


@router.get("/session/{session_id}")
async def get_session_prompts(
    session_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get all system prompts for a specific session"""
    try:
        result = await db.execute(
            select(SystemPromptModel)
            .where(SystemPromptModel.session_id == session_id)
            .order_by(SystemPromptModel.created_at.desc())
        )
        prompts = result.scalars().all()
        
        return {
            "prompts": [prompt.to_dict() for prompt in prompts],
            "total": len(prompts),
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prompts: {str(e)}")


@router.post("/")
async def create_prompt(
    prompt_data: CreatePromptRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new system prompt"""
    try:
        # Calculate word and character counts
        word_count = len(prompt_data.content.split())
        char_count = len(prompt_data.content)
        
        new_prompt = SystemPromptModel(
            session_id=prompt_data.session_id,
            content=prompt_data.content.strip(),
            word_count=word_count,
            char_count=char_count
        )
        
        db.add(new_prompt)
        await db.commit()
        await db.refresh(new_prompt)
        
        return {
            "message": "System prompt created successfully",
            "prompt": new_prompt.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create prompt: {str(e)}")


@router.put("/{prompt_id}")
async def update_prompt(
    prompt_id: int,
    prompt_data: UpdatePromptRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """Update an existing system prompt"""
    try:
        result = await db.execute(
            select(SystemPromptModel).where(SystemPromptModel.id == prompt_id)
        )
        prompt = result.scalar_one_or_none()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="System prompt not found")
        
        # Update content and recalculate counts
        prompt.content = prompt_data.content.strip()
        prompt.word_count = len(prompt_data.content.split())
        prompt.char_count = len(prompt_data.content)
        
        await db.commit()
        await db.refresh(prompt)
        
        return {
            "message": "System prompt updated successfully",
            "prompt": prompt.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update prompt: {str(e)}")


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a system prompt"""
    try:
        result = await db.execute(
            select(SystemPromptModel).where(SystemPromptModel.id == prompt_id)
        )
        prompt = result.scalar_one_or_none()
        
        if not prompt:
            raise HTTPException(status_code=404, detail="System prompt not found")
        
        await db.delete(prompt)
        await db.commit()
        
        return {"message": "System prompt deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete prompt: {str(e)}")


@router.get("/test")
async def test_prompts_endpoint():
    """Test endpoint for system prompts"""
    return {
        "message": "System Prompts API is working!",
        "endpoints": [
            "GET /api/prompts/session/{session_id} - Get prompts for session",
            "POST /api/prompts/ - Create new prompt",
            "PUT /api/prompts/{prompt_id} - Update prompt",
            "DELETE /api/prompts/{prompt_id} - Delete prompt",
            "GET /api/prompts/test - This test endpoint"
        ]
    }