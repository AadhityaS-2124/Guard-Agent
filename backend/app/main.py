import os
import json
import asyncio
import logging
import traceback
from typing import Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from app.remediation_graph import remediation_graph
from app.security import redact_secrets, sanitize_text

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Multi-Agent Vulnerability Remediation API")

# Configure CORS for Frontend integration (restricted to localhost development ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    secrets_to_redact = []
    
    # Try to grab the api_key from the request body if it is a JSON request
    try:
        body = await request.json()
        if isinstance(body, dict) and "api_key" in body:
            secrets_to_redact.append(body["api_key"])
    except Exception:
        pass
        
    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key:
        secrets_to_redact.append(env_key)

    # Format the exception traceback
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    
    # Sanitize traceback and message
    sanitized_tb = sanitize_text(tb_str, secrets_to_redact)
    sanitized_message = sanitize_text(str(exc), secrets_to_redact)
    
    # Log the sanitized traceback
    logger.error("Unhandled exception caught by security layer:\n%s", sanitized_tb)
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {sanitized_message}"}
    )

class RemediationRequest(BaseModel):
    code: str
    api_key: Optional[str] = None

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/remediate")
async def remediate_code(request: RemediationRequest):
    # Retrieve API key, fallback to env variable if not provided
    api_key = request.api_key or os.environ.get("GEMINI_API_KEY")
    
    async def event_generator():
        # Initialize internal state representation
        state = {
            "original_code": request.code,
            "patched_code": request.code,
            "vulnerabilities": [],
            "error_logs": [],
            "iteration_count": 0,
            "pipeline_step": "scanning",
            "history": [],
            "compile_success": False,
            "api_key": api_key,
            "error_message": None
        }
        
        # Yield the starting state
        yield f"data: {json.dumps(serialize_state(state))}\n\n"
        await asyncio.sleep(0.3)
        
        try:
            # Execute LangGraph asynchronously, capturing updates at each node execution
            async for chunk in remediation_graph.astream(state, stream_mode="updates"):
                for node_name, updates in chunk.items():
                    # Apply updates to our local state representation
                    for key, val in updates.items():
                        state[key] = val
                    
                    # Yield updated state to client
                    yield f"data: {json.dumps(serialize_state(state))}\n\n"
                    
                    # Add tiny pause for stepper visibility and animation in UI
                    await asyncio.sleep(0.6)
                    
        except Exception as e:
            state["error_message"] = f"Pipeline execution failed: {str(e)}"
            state["pipeline_step"] = "complete"
            yield f"data: {json.dumps(serialize_state(state))}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

def serialize_state(state: dict) -> dict:
    """Filters out non-serializable fields and redacts secrets before sending state to frontend."""
    serialized = {
        "original_code": state.get("original_code", ""),
        "patched_code": state.get("patched_code", ""),
        "vulnerabilities": state.get("vulnerabilities", []),
        "error_logs": state.get("error_logs", []),
        "iteration_count": state.get("iteration_count", 0),
        "pipeline_step": state.get("pipeline_step", "scanning"),
        "history": state.get("history", []),
        "compile_success": state.get("compile_success", False),
        "error_message": state.get("error_message")
    }
    
    # Gather potential secrets to redact from this state run
    secrets_to_redact = []
    req_key = state.get("api_key")
    if req_key:
        secrets_to_redact.append(req_key)
    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key:
        secrets_to_redact.append(env_key)
        
    return redact_secrets(serialized, secrets_to_redact)

if __name__ == "__main__":
    import uvicorn
    # Use app.main:app to allow running uvicorn from the backend root folder
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
