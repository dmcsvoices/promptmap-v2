"""
Test Runner Service for PromptMap V2
Handles test execution and result storage
"""

import asyncio
import json
import logging
from typing import List, Dict, Any, Callable, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from models.session import SessionModel
from models.test_rule import TestRuleModel
from models.test_result import TestResultModel
from models.system_prompt import SystemPromptModel
from models.configuration import ConfigurationModel
from services.llm_client import LLMClientManager, TestEvaluator

logger = logging.getLogger(__name__)


class TestRunner:
    """Manages test execution for sessions"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def get_llm_config(self) -> Dict[str, Any]:
        """Get LLM configuration from database"""
        try:
            result = await self.db_session.execute(
                select(ConfigurationModel).where(ConfigurationModel.config_key == "openai_endpoint")
            )
            config = result.scalar_one_or_none()
            
            if not config:
                raise ValueError("OpenAI endpoint configuration not found")
            
            config_data = json.loads(config.config_value) if config.config_value else {}
            
            return {
                "base_url": config_data.get("base_url", "http://localhost:11434/v1"),
                "api_key": config_data.get("api_key"),
                "timeout": config_data.get("timeout", 30)
            }
        except Exception as e:
            logger.error(f"Error getting LLM config: {str(e)}")
            # Fallback configuration
            return {
                "base_url": "http://localhost:11434/v1",
                "api_key": None,
                "timeout": 30
            }

    async def get_test_settings(self) -> Dict[str, Any]:
        """Get test execution settings from database"""
        try:
            result = await self.db_session.execute(
                select(ConfigurationModel).where(ConfigurationModel.config_key == "test_settings")
            )
            config = result.scalar_one_or_none()
            
            if config:
                config_data = json.loads(config.config_value) if config.config_value else {}
            else:
                config_data = {}
            
            return {
                "test_timeout": config_data.get("test_timeout", 120)  # 2 minutes default
            }
        except Exception as e:
            logger.error(f"Error getting test settings: {str(e)}")
            # Fallback configuration
            return {
                "test_timeout": 120
            }
    
    async def get_session_system_prompts(self, session_id: int) -> List[SystemPromptModel]:
        """Get all system prompts for a session"""
        try:
            result = await self.db_session.execute(
                select(SystemPromptModel)
                .where(SystemPromptModel.session_id == session_id)
                .order_by(SystemPromptModel.created_at.asc())
            )
            prompts = result.scalars().all()
            return list(prompts)
        except Exception as e:
            logger.error(f"Error getting system prompts for session {session_id}: {str(e)}")
            return []
    
    async def run_single_test(self, llm_client: LLMClientManager, model: str, 
                            system_prompt: str, test_rule: TestRuleModel, 
                            iterations: int = 5, use_classifier: bool = True) -> Dict[str, Any]:
        """Run a single test rule multiple times"""
        results = []
        passed_count = 0
        total_time = 0
        
        for i in range(iterations):
            logger.info(f"Running iteration {i+1}/{iterations} for test: {test_rule.name}")
            
            # Execute the test
            result = await llm_client.test_prompt_injection(
                model=model,
                system_prompt=system_prompt,
                test_prompt=test_rule.prompt
            )
            
            if result["success"]:
                # Evaluate the result - use classifier if enabled
                if use_classifier:
                    evaluation = await TestEvaluator.evaluate_with_classifier(
                        rule_type=test_rule.type,
                        response=result["content"],
                        system_prompt=system_prompt,
                        test_prompt=test_rule.prompt,
                        db=self.db_session
                    )
                else:
                    evaluation = TestEvaluator.evaluate_test_result(
                        rule_type=test_rule.type,
                        response=result["content"],
                        system_prompt=system_prompt,
                        test_prompt=test_rule.prompt
                    )
                
                test_result = {
                    "iteration": i + 1,
                    "passed": evaluation["passed"],
                    "response": result["content"],
                    "failure_reason": evaluation["reason"] if not evaluation["passed"] else None,
                    "response_time_ms": result["response_time_ms"]
                }
                
                if evaluation["passed"]:
                    passed_count += 1
                
                total_time += result["response_time_ms"]
                results.append(test_result)
                
                # Early stopping on first failure (like V1)
                if not evaluation["passed"]:
                    break
            else:
                # LLM request failed
                test_result = {
                    "iteration": i + 1,
                    "passed": False,
                    "response": "",
                    "failure_reason": f"LLM request failed: {result['error']}",
                    "response_time_ms": result["response_time_ms"]
                }
                results.append(test_result)
                break
        
        # Calculate final metrics
        total_runs = len(results)
        failed_runs = total_runs - passed_count
        asr = ((total_runs - passed_count) / total_runs) * 100 if total_runs > 0 else 0
        overall_passed = passed_count == total_runs
        pass_rate = f"{passed_count}/{total_runs}"
        
        # Get the last result for response/failure reason
        last_result = results[-1] if results else {
            "response": "", 
            "failure_reason": "No results generated"
        }
        
        return {
            "passed": overall_passed,
            "pass_rate": pass_rate,
            "asr": asr,
            "total_runs": total_runs,
            "passed_runs": passed_count,
            "failed_runs": failed_runs,
            "response": last_result["response"],
            "failure_reason": last_result["failure_reason"],
            "execution_time_ms": total_time,
            "iterations": results
        }
    
    async def run_test_session(self, session_id: int, selected_rule_ids: List[int],
                             progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """Run tests for a session"""
        try:
            # Get session
            result = await self.db_session.execute(
                select(SessionModel).where(SessionModel.id == session_id)
            )
            session = result.scalar_one_or_none()
            
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            # Get LLM configuration and test settings
            llm_config = await self.get_llm_config()
            test_settings = await self.get_test_settings()
            
            # Get all system prompts
            system_prompts = await self.get_session_system_prompts(session_id)
            
            # Get selected test rules
            result = await self.db_session.execute(
                select(TestRuleModel).where(
                    TestRuleModel.id.in_(selected_rule_ids),
                    TestRuleModel.enabled == True
                )
            )
            test_rules = result.scalars().all()
            
            if not test_rules:
                raise ValueError("No enabled test rules found for selected IDs")
            
            if not system_prompts:
                raise ValueError("No system prompts found for this session")
            
            # Update session status to running
            await self.db_session.execute(
                update(SessionModel)
                .where(SessionModel.id == session_id)
                .values(status="running")
            )
            await self.db_session.commit()
            
            # Initialize LLM client with test timeout
            async with LLMClientManager(
                base_url=llm_config["base_url"],
                api_key=llm_config["api_key"],
                timeout=test_settings["test_timeout"]  # Use test timeout instead of endpoint timeout
            ) as llm_client:
                
                # Test connection first
                connection_test = await llm_client.test_connection()
                if not connection_test["success"]:
                    raise ValueError(f"LLM connection failed: {connection_test['error']}")
                
                results = []
                total_tests = len(test_rules) * len(system_prompts)  # Each rule tested against each prompt
                completed_tests = 0
                
                # Loop through each system prompt
                for prompt_idx, system_prompt in enumerate(system_prompts):
                    # Loop through each test rule for this prompt
                    for rule_idx, rule in enumerate(test_rules):
                        test_number = prompt_idx * len(test_rules) + rule_idx + 1
                        
                        if progress_callback:
                            await progress_callback({
                                "message": f"Running test: {rule.name} (Prompt #{prompt_idx + 1})",
                                "progress": int((completed_tests / total_tests) * 100),
                                "test_name": rule.name,
                                "session_id": session_id,
                                "completed": completed_tests,
                                "total": total_tests
                            })
                        
                        # Run the test
                        test_result = await self.run_single_test(
                            llm_client=llm_client,
                            model=session.model,
                            system_prompt=system_prompt.content,
                            test_rule=rule,
                            iterations=session.iterations
                        )
                        
                        # Store result in database
                        db_result = TestResultModel(
                            session_id=session_id,
                            prompt_id=system_prompt.id,  # Link to the specific prompt
                            rule_id=rule.id,
                            rule_name=rule.name,
                            rule_type=rule.type,
                            rule_severity=rule.severity,
                            passed=test_result["passed"],
                            pass_rate=test_result["pass_rate"],
                            asr=test_result["asr"],
                            total_runs=test_result["total_runs"],
                            passed_runs=test_result["passed_runs"],
                            failed_runs=test_result["failed_runs"],
                            response=test_result["response"],
                            failure_reason=test_result["failure_reason"],
                            execution_time_ms=test_result["execution_time_ms"]
                        )
                        
                        self.db_session.add(db_result)
                        results.append(test_result)
                        completed_tests += 1
                        
                        # Commit after each test to save progress
                        await self.db_session.commit()
                
                # Calculate session statistics
                total_passed = sum(1 for r in results if r["passed"])
                total_failed = len(results) - total_passed
                overall_asr = (total_failed / len(results)) * 100 if results else 0
                
                # Update session with final results
                await self.db_session.execute(
                    update(SessionModel)
                    .where(SessionModel.id == session_id)
                    .values(
                        status="completed",
                        total_tests=len(results),
                        passed_tests=total_passed,
                        failed_tests=total_failed,
                        overall_asr=overall_asr
                    )
                )
                await self.db_session.commit()
                
                if progress_callback:
                    await progress_callback({
                        "message": "Test session completed successfully",
                        "progress": 100,
                        "session_id": session_id,
                        "completed": completed_tests,
                        "total": total_tests,
                        "finished": True
                    })
                
                return {
                    "success": True,
                    "session_id": session_id,
                    "total_tests": len(results),
                    "passed_tests": total_passed,
                    "failed_tests": total_failed,
                    "overall_asr": overall_asr,
                    "results": [r for r in results]  # Include detailed results
                }
                
        except Exception as e:
            logger.error(f"Error running test session {session_id}: {str(e)}")
            
            # Update session status to failed
            try:
                await self.db_session.execute(
                    update(SessionModel)
                    .where(SessionModel.id == session_id)
                    .values(status="failed")
                )
                await self.db_session.commit()
            except:
                pass
            
            if progress_callback:
                await progress_callback({
                    "message": f"Test session failed: {str(e)}",
                    "progress": 0,
                    "session_id": session_id,
                    "error": True
                })
            
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id
            }