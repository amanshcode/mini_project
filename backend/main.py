import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from project import run_generation

app = FastAPI(title="VeritasAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or replace "*" with your production Vercel frontend URL later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    request: str
    tone: str
    audience: str
    career_profile: Optional[str] = ""

@app.websocket("/ws/generate")
async def websocket_generate(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        request_text = data.get("request")
        tone = data.get("tone")
        audience = data.get("audience")
        career_profile = data.get("career_profile", "")

        if not isinstance(request_text, str) or not request_text.strip():
            await websocket.send_json({
                "node": "Error",
                "status": "Failed",
                "detail": "Please enter a request before generating content.",
            })
            return

        loop = asyncio.get_running_loop()
        progress_futures = []

        def progress_callback(event):
            progress_futures.append(
                asyncio.run_coroutine_threadsafe(
                    websocket.send_json(event),
                    loop,
                )
            )

        result = await asyncio.to_thread(
            run_generation,
            request_text.strip(),
            tone or "",
            audience or "",
            career_profile or "",
            progress_callback,
        )

        if progress_futures:
            await asyncio.gather(
                *(asyncio.wrap_future(future) for future in progress_futures)
            )

        await websocket.send_json({
            "node": "Final Approval",
            "status": "Approved" if result.get("is_approved") else "Needs Review",
            "detail": "Generation finished.",
            "draft": result.get("draft", ""),
            "review_feedback": result.get("review_feedback", ""),
            "is_approved": result.get("is_approved", False),
            "scorecard": result.get("scorecard", {}),
            "claim_checks": result.get("claim_checks", []),
            "attempt": result.get("attempt", 0),
        })
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_json({
            "node": "Error",
            "status": "Failed",
            "detail": str(e),
        })