"""
Config API endpoints for PromptMap V2
Handles configuration and OpenAI-compliant endpoint management
"""

import httpx
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional

from database.connection import get_db_session
from models.configuration import ConfigurationModel

router = APIRouter()


@router.get("/")
async def list_config(db: AsyncSession = Depends(get_db_session)):
    """Get all configuration settings"""
    try:
        result = await db.execute(select(ConfigurationModel))
        configs = result.scalars().all()
        return {
            "configs": [config.to_dict() for config in configs],
            "total": len(configs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch config: {str(e)}")


@router.get("/defaults")
async def get_defaults():
    """Get default configuration values"""
    return {
        "iterations": 5,
        "severities": ["low", "medium", "high"],
        "model_types": ["openai", "anthropic", "ollama"],
        "default_models": {
            "openai": "gpt-3.5-turbo",
            "anthropic": "claude-3-haiku-20240307",
            "ollama": "llama2:7b"
        }
    }


@router.get("/test")
async def test_config_endpoint():
    """Test endpoint for config"""
    return {
        "message": "Config API is working!",
        "endpoints": [
            "GET /api/config/ - List all config",
            "GET /api/config/defaults - Get defaults",
            "POST /api/config/openai-endpoint - Set OpenAI-compliant endpoint",
            "GET /api/config/openai-endpoint - Get current endpoint",
            "GET /api/config/models - Fetch models from configured endpoint",
            "POST /api/config/test-endpoint - Test endpoint connectivity",
            "POST /api/config/test-settings - Set test execution settings",
            "GET /api/config/test-settings - Get test execution settings",
            "GET /api/config/test - This test endpoint"
        ]
    }


# Pydantic models for request/response
class OpenAIEndpointConfig(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    timeout: Optional[int] = 30

class TestEndpointRequest(BaseModel):
    base_url: str
    timeout: Optional[int] = 10

class TestSettingsConfig(BaseModel):
    test_timeout: Optional[int] = 120  # 2 minutes default

class ModelResponse(BaseModel):
    id: str
    object: str = "model"
    created: Optional[int] = None
    owned_by: Optional[str] = None


@router.post("/openai-endpoint")
async def set_openai_endpoint(
    config: OpenAIEndpointConfig,
    db: AsyncSession = Depends(get_db_session)
):
    """Set or update OpenAI-compliant endpoint configuration"""
    try:
        # Store in database configuration table
        # For now, we'll use a simple approach - you might want to encrypt sensitive data
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "openai_endpoint")
        )
        existing_config = result.scalar_one_or_none()
        
        config_data = {
            "base_url": config.base_url,
            "api_key": config.api_key,
            "timeout": config.timeout
        }
        
        if existing_config:
            existing_config.config_value = json.dumps(config_data)
        else:
            new_config = ConfigurationModel(
                config_key="openai_endpoint",
                config_value=json.dumps(config_data)
            )
            db.add(new_config)
        
        await db.commit()
        
        return {
            "message": "OpenAI endpoint configuration saved successfully",
            "base_url": config.base_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")


@router.get("/openai-endpoint")
async def get_openai_endpoint(db: AsyncSession = Depends(get_db_session)):
    """Get current OpenAI-compliant endpoint configuration"""
    try:
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "openai_endpoint")
        )
        config = result.scalar_one_or_none()
        
        if not config:
            return {
                "base_url": "http://172.27.0.67:11434/v1",  # Default
                "api_key": None,
                "timeout": 30,
                "configured": False
            }
        
        config_data = json.loads(config.config_value) if config.config_value else {}
        return {
            **config_data,
            "configured": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch configuration: {str(e)}")


@router.get("/models")
async def fetch_models(db: AsyncSession = Depends(get_db_session)):
    """Fetch available models from the configured OpenAI-compliant endpoint"""
    try:
        # Get endpoint configuration
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "openai_endpoint")
        )
        config = result.scalar_one_or_none()
        
        base_url = None
        if config and config.config_value:
            config_data = json.loads(config.config_value)
            base_url = config_data.get("base_url")
            timeout = config_data.get("timeout", 30)
        
        if not base_url:
            # Use default if no base_url found
            base_url = "http://172.27.0.67:11434/v1"
            timeout = 30
        
        # Construct models endpoint URL
        models_url = f"{base_url.rstrip('/')}/models"
        
        # Make request to models endpoint
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(models_url)
            response.raise_for_status()
            
            models_data = response.json()
            
            # Extract model list - handle different response formats
            if "data" in models_data:
                models = models_data["data"]
            elif "models" in models_data:
                models = models_data["models"]
            elif isinstance(models_data, list):
                models = models_data
            else:
                models = []
            
            # Format models consistently
            formatted_models = []
            for model in models:
                if isinstance(model, dict):
                    formatted_models.append({
                        "id": model.get("id", model.get("name", "unknown")),
                        "object": model.get("object", "model"),
                        "created": model.get("created"),
                        "owned_by": model.get("owned_by", "local")
                    })
                elif isinstance(model, str):
                    formatted_models.append({
                        "id": model,
                        "object": "model",
                        "created": None,
                        "owned_by": "local"
                    })
            
            return {
                "models": formatted_models,
                "total": len(formatted_models),
                "endpoint": models_url
            }
    
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502, 
            detail=f"Failed to connect to models endpoint: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Models endpoint returned error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/test-endpoint")
async def test_endpoint_connectivity(request: TestEndpointRequest):
    """Test connectivity to an OpenAI-compliant endpoint"""
    try:
        models_url = f"{request.base_url.rstrip('/')}/models"
        
        async with httpx.AsyncClient(timeout=request.timeout) as client:
            response = await client.get(models_url)
            response.raise_for_status()
            
            models_data = response.json()
            
            # Count available models
            model_count = 0
            if "data" in models_data:
                model_count = len(models_data["data"])
            elif "models" in models_data:
                model_count = len(models_data["models"])
            elif isinstance(models_data, list):
                model_count = len(models_data)
            
            return {
                "success": True,
                "message": f"Successfully connected to {request.base_url}",
                "models_found": model_count,
                "endpoint": models_url,
                "response_time_ms": response.elapsed.total_seconds() * 1000
            }
    
    except httpx.RequestError as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}",
            "endpoint": f"{request.base_url.rstrip('/')}/models"
        }
    except httpx.HTTPStatusError as e:
        return {
            "success": False,
            "message": f"HTTP error {e.response.status_code}: {e.response.text}",
            "endpoint": f"{request.base_url.rstrip('/')}/models"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error: {str(e)}",
            "endpoint": f"{request.base_url.rstrip('/')}/models"
        }


@router.post("/test-settings")
async def set_test_settings(
    config: TestSettingsConfig,
    db: AsyncSession = Depends(get_db_session)
):
    """Set or update test execution settings"""
    try:
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "test_settings")
        )
        existing_config = result.scalar_one_or_none()
        
        config_data = {
            "test_timeout": config.test_timeout
        }
        
        if existing_config:
            existing_config.config_value = json.dumps(config_data)
            await db.commit()
        else:
            new_config = ConfigurationModel(
                config_key="test_settings",
                config_value=json.dumps(config_data)
            )
            db.add(new_config)
            await db.commit()
        
        return {
            "message": "Test settings saved successfully",
            "test_timeout": config.test_timeout
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save test settings: {str(e)}")


@router.get("/test-settings")
async def get_test_settings(db: AsyncSession = Depends(get_db_session)):
    """Get current test execution settings"""
    try:
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "test_settings")
        )
        config = result.scalar_one_or_none()
        
        if config:
            config_data = json.loads(config.config_value) if config.config_value else {}
        else:
            config_data = {}
        
        return {
            "test_timeout": config_data.get("test_timeout", 120),
            "configured": config is not None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get test settings: {str(e)}")


class ClassifierConfig(BaseModel):
    base_url: str
    api_key: Optional[str] = None
    model: str
    timeout: int = 30
    enabled: bool = False


@router.post("/classifier-endpoint")
async def set_classifier_endpoint(
    config: ClassifierConfig,
    db: AsyncSession = Depends(get_db_session)
):
    """Set or update text classifier endpoint configuration"""
    try:
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "classifier_endpoint")
        )
        existing_config = result.scalar_one_or_none()
        
        config_data = {
            "base_url": config.base_url,
            "api_key": config.api_key,
            "model": config.model,
            "timeout": config.timeout,
            "enabled": config.enabled
        }
        
        if existing_config:
            existing_config.config_value = json.dumps(config_data)
        else:
            new_config = ConfigurationModel(
                config_key="classifier_endpoint",
                config_value=json.dumps(config_data)
            )
            db.add(new_config)
        
        await db.commit()
        
        return {
            "message": "Classifier endpoint configuration updated successfully",
            "config": {
                "base_url": config.base_url,
                "model": config.model,
                "timeout": config.timeout,
                "enabled": config.enabled,
                "configured": True
            }
        }
    except Exception as e:
        logger.error(f"Error setting classifier endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set classifier endpoint: {str(e)}")


@router.get("/classifier-endpoint")
async def get_classifier_endpoint(db: AsyncSession = Depends(get_db_session)):
    """Get current text classifier endpoint configuration"""
    try:
        result = await db.execute(
            select(ConfigurationModel).where(ConfigurationModel.config_key == "classifier_endpoint")
        )
        config = result.scalar_one_or_none()
        
        if not config:
            return {
                "base_url": "",
                "model": "",
                "timeout": 30,
                "enabled": False,
                "configured": False
            }
        
        config_data = json.loads(config.config_value) if config.config_value else {}
        
        return {
            "base_url": config_data.get("base_url", ""),
            "model": config_data.get("model", ""),
            "timeout": config_data.get("timeout", 30),
            "enabled": config_data.get("enabled", False),
            "configured": True
        }
    except Exception as e:
        logger.error(f"Error getting classifier endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get classifier endpoint: {str(e)}")