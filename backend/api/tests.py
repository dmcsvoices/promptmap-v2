"""
Tests API endpoints for PromptMap V2
"""

import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database.connection import get_db_session
from models.test_rule import TestRuleModel
from services.test_runner import TestRunner

router = APIRouter()


class RunTestsRequest(BaseModel):
    session_id: int
    test_rule_ids: List[int]


@router.get("/rules")
async def list_test_rules(db: AsyncSession = Depends(get_db_session)):
    """Get all test rules"""
    try:
        result = await db.execute(
            select(TestRuleModel)
            .where(TestRuleModel.enabled == True)
            .order_by(TestRuleModel.severity, TestRuleModel.name)
        )
        rules = result.scalars().all()
        return {
            "rules": [rule.to_dict() for rule in rules],
            "total": len(rules)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch test rules: {str(e)}")


@router.post("/run")
async def run_tests(
    request: RunTestsRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db_session)
):
    """Run selected tests for a session"""
    try:
        if not request.test_rule_ids:
            raise HTTPException(status_code=400, detail="No test rules selected")
        
        # Verify session exists
        from models.session import SessionModel
        result = await db.execute(select(SessionModel).where(SessionModel.id == request.session_id))
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")
        
        # Verify test rules exist
        result = await db.execute(
            select(TestRuleModel).where(TestRuleModel.id.in_(request.test_rule_ids))
        )
        rules = result.scalars().all()
        
        if len(rules) != len(request.test_rule_ids):
            raise HTTPException(status_code=400, detail="Some test rules not found")
        
        # Create test runner and start background task
        test_runner = TestRunner(db)
        
        # For now, run synchronously (can be made async later with WebSocket support)
        result = await test_runner.run_test_session(
            session_id=request.session_id,
            selected_rule_ids=request.test_rule_ids
        )
        
        if result["success"]:
            return {
                "message": "Tests completed successfully",
                "session_id": request.session_id,
                "total_tests": result["total_tests"],
                "passed_tests": result["passed_tests"],
                "failed_tests": result["failed_tests"],
                "overall_asr": result["overall_asr"]
            }
        else:
            raise HTTPException(status_code=500, detail=f"Test execution failed: {result['error']}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run tests: {str(e)}")


@router.get("/test")
async def test_tests_endpoint():
    """Test endpoint for tests"""
    return {
        "message": "Tests API is working!",
        "endpoints": [
            "GET /api/tests/rules - List all test rules",
            "POST /api/tests/run - Run selected tests",
            "GET /api/tests/test - This test endpoint"
        ]
    }