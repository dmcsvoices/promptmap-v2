"""
Models API endpoints for PromptMap V2
Skeleton implementation
"""

from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()


@router.get("/test")
async def test_models_endpoint():
    """Test endpoint for models"""
    return {
        "message": "Models API is working!",
        "endpoints": [
            "GET /api/models/ollama - Get Ollama models",
            "GET /api/models/{model_type} - Get models by type",
            "GET /api/models/test - This test endpoint"
        ]
    }


@router.get("/ollama")
async def get_ollama_models():
    """Get available Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                models = []
                for model in data.get('models', []):
                    models.append({
                        'name': model.get('name', ''),
                        'size': model.get('size', 0),
                        'modified_at': model.get('modified_at', '')
                    })
                return {"models": models, "count": len(models)}
            else:
                raise HTTPException(status_code=503, detail="Ollama server not accessible")
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="Ollama server timeout")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama connection failed: {str(e)}")


@router.get("/{model_type}")
async def get_models_by_type(model_type: str):
    """Get models by type"""
    if model_type == "ollama":
        return await get_ollama_models()
    elif model_type == "openai":
        return {
            "models": [
                {"name": "gpt-4o", "description": "GPT-4 Omni - Latest multimodal model"},
                {"name": "gpt-4o-mini", "description": "GPT-4 Omni Mini - Faster and cheaper"},
                {"name": "gpt-4-turbo", "description": "GPT-4 Turbo - Latest GPT-4"},
                {"name": "gpt-3.5-turbo", "description": "GPT-3.5 Turbo - Fast and efficient"}
            ],
            "count": 4
        }
    elif model_type == "anthropic":
        return {
            "models": [
                {"name": "claude-3-5-sonnet-20241022", "description": "Claude 3.5 Sonnet - Latest"},
                {"name": "claude-3-opus-20240229", "description": "Claude 3 Opus - Most powerful"},
                {"name": "claude-3-sonnet-20240229", "description": "Claude 3 Sonnet - Balanced"},
                {"name": "claude-3-haiku-20240307", "description": "Claude 3 Haiku - Fast"}
            ],
            "count": 4
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported model type: {model_type}")