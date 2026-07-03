import os
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.remediation_graph import remediation_graph

app = FastAPI(title="Multi-Agent Vulnerability Remediation API")

# Configure CORS for Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend host
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Filters out non-serializable fields (like api_key) before sending state to frontend."""
    return {
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
