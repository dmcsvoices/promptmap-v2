"""
Results API endpoints for PromptMap V2
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from database.connection import get_db_session
from models.session import SessionModel
from models.test_result import TestResultModel
from models.system_prompt import SystemPromptModel

router = APIRouter()


async def get_prompt_number_mapping(session_id: int, db: AsyncSession) -> Dict[int, int]:
    """Get mapping from prompt_id to prompt_number (1-indexed) for a session"""
    session_prompts_query = (
        select(SystemPromptModel.id)
        .where(SystemPromptModel.session_id == session_id)
        .order_by(SystemPromptModel.created_at.asc())
    )
    prompts_result = await db.execute(session_prompts_query)
    session_prompts = prompts_result.scalars().all()
    
    # Create a mapping from prompt_id to prompt_number (1-indexed)
    return {prompt_id: idx + 1 for idx, prompt_id in enumerate(session_prompts)}


class SessionStatistics(BaseModel):
    session_id: int
    session_name: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    average_asr: float
    by_severity: Dict[str, Dict[str, Any]]
    by_type: Dict[str, Dict[str, Any]]


class ResultsResponse(BaseModel):
    results: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int
    pages: int


@router.get("/sessions/{session_id}/statistics", response_model=SessionStatistics)
async def get_session_statistics(
    session_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get comprehensive statistics for a session"""
    try:
        # Get session info
        session_result = await db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Get overall statistics
        results_query = select(TestResultModel).where(TestResultModel.session_id == session_id)
        results = await db.execute(results_query)
        all_results = results.scalars().all()
        
        if not all_results:
            return SessionStatistics(
                session_id=session_id,
                session_name=session.name,
                total_tests=0,
                passed_tests=0,
                failed_tests=0,
                average_asr=0.0,
                by_severity={},
                by_type={}
            )
        
        total_tests = len(all_results)
        passed_tests = sum(1 for r in all_results if r.passed)
        failed_tests = total_tests - passed_tests
        average_asr = sum(float(r.asr) for r in all_results) / total_tests
        
        # Group by severity
        by_severity = {}
        for severity in ['low', 'medium', 'high']:
            severity_results = [r for r in all_results if r.rule_severity == severity]
            if severity_results:
                severity_total = len(severity_results)
                severity_passed = sum(1 for r in severity_results if r.passed)
                severity_failed = severity_total - severity_passed
                severity_asr = sum(float(r.asr) for r in severity_results) / severity_total
                
                by_severity[severity] = {
                    'total': severity_total,
                    'passed': severity_passed,
                    'failed': severity_failed,
                    'avg_asr': round(severity_asr, 2)
                }
        
        # Group by type
        by_type = {}
        types = list(set(r.rule_type for r in all_results))
        for rule_type in types:
            type_results = [r for r in all_results if r.rule_type == rule_type]
            type_total = len(type_results)
            type_passed = sum(1 for r in type_results if r.passed)
            type_failed = type_total - type_passed
            type_asr = sum(float(r.asr) for r in type_results) / type_total
            
            by_type[rule_type] = {
                'total': type_total,
                'passed': type_passed,
                'failed': type_failed,
                'avg_asr': round(type_asr, 2)
            }
        
        return SessionStatistics(
            session_id=session_id,
            session_name=session.name,
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            average_asr=round(average_asr, 2),
            by_severity=by_severity,
            by_type=by_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session statistics: {str(e)}")


@router.get("/sessions/{session_id}/results", response_model=ResultsResponse)
async def get_session_results(
    session_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session)
):
    """Get paginated results for a session"""
    try:
        # Verify session exists
        session_result = await db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Get total count
        count_query = select(func.count(TestResultModel.id)).where(TestResultModel.session_id == session_id)
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Calculate pagination
        offset = (page - 1) * per_page
        pages = (total + per_page - 1) // per_page  # Ceiling division
        
        # Get prompt number mapping for this session
        prompt_id_to_number = await get_prompt_number_mapping(session_id, db)
        
        # Get paginated results with session and prompt information
        results_query = (
            select(TestResultModel, SessionModel.name, SystemPromptModel.id)
            .join(SessionModel, TestResultModel.session_id == SessionModel.id)
            .outerjoin(SystemPromptModel, TestResultModel.prompt_id == SystemPromptModel.id)
            .where(TestResultModel.session_id == session_id)
            .order_by(TestResultModel.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        
        results = await db.execute(results_query)
        results_list = results.all()
        
        # Build enhanced result objects
        enhanced_results = []
        for result, session_name, prompt_id in results_list:
            result_dict = result.to_dict()
            result_dict['session_name'] = session_name
            result_dict['prompt_number'] = prompt_id_to_number.get(prompt_id, 'N/A') if prompt_id else 'N/A'
            enhanced_results.append(result_dict)
        
        return ResultsResponse(
            results=enhanced_results,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session results: {str(e)}")


@router.get("/results/{result_id}")
async def get_result_details(
    result_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Get detailed information for a specific result"""
    try:
        result_query = (
            select(TestResultModel, SessionModel.name, SystemPromptModel.id)
            .join(SessionModel, TestResultModel.session_id == SessionModel.id)
            .outerjoin(SystemPromptModel, TestResultModel.prompt_id == SystemPromptModel.id)
            .where(TestResultModel.id == result_id)
        )
        
        result = await db.execute(result_query)
        result_data = result.first()
        
        if not result_data:
            raise HTTPException(status_code=404, detail=f"Result {result_id} not found")
        
        test_result, session_name, prompt_id = result_data
        
        # Get prompt number for this result
        if prompt_id:
            prompt_id_to_number = await get_prompt_number_mapping(test_result.session_id, db)
            prompt_number = prompt_id_to_number.get(prompt_id, 'N/A')
        else:
            prompt_number = 'N/A'
        
        result_dict = test_result.to_dict()
        result_dict['session_name'] = session_name
        result_dict['prompt_number'] = prompt_number
        
        return result_dict
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get result details: {str(e)}")


@router.get("/sessions/{session_id}/export")
async def export_session_results(
    session_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Export complete session data and results"""
    try:
        # Get session info
        session_result = await db.execute(
            select(SessionModel).where(SessionModel.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Get statistics
        statistics = await get_session_statistics(session_id, db)
        
        # Get prompt number mapping for this session
        prompt_id_to_number = await get_prompt_number_mapping(session_id, db)
        
        # Get all results
        results_query = select(TestResultModel).where(TestResultModel.session_id == session_id)
        results = await db.execute(results_query)
        all_results = results.scalars().all()
        
        # Add prompt numbers to results
        enhanced_results = []
        for result in all_results:
            result_dict = result.to_dict()
            result_dict['prompt_number'] = prompt_id_to_number.get(result.prompt_id, 'N/A') if result.prompt_id else 'N/A'
            enhanced_results.append(result_dict)
        
        import datetime

        export_data = {
            "session": session.to_dict(),
            "statistics": statistics.dict(),
            "results": enhanced_results,
            "exported_at": datetime.datetime.utcnow().isoformat()
        }
        
        return export_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export session results: {str(e)}")


@router.get("/test")
async def test_results_endpoint():
    """Test endpoint for results"""
    return {
        "message": "Results API is working!",
        "endpoints": [
            "GET /api/results/sessions/{session_id}/statistics - Get session statistics",
            "GET /api/results/sessions/{session_id}/results - Get paginated results",
            "GET /api/results/results/{result_id} - Get result details",
            "GET /api/results/sessions/{session_id}/export - Export session data",
            "GET /api/results/test - This test endpoint"
        ]
    }