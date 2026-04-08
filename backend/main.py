import os
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid

# Import our existing logic (now in backend/app)
from app.auth import API_ID, API_HASH
from app.logger import log
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="TGCleaner API")

# Enable CORS for our React frontend later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active login attempts and clients
# Key: request_id (UUID), Value: {client: TelegramClient, phone: str, phone_code_hash: str}
login_pending = {}
# Key: session_id (UUID), Value: TelegramClient (authenticated)
active_sessions = {}

class PhoneRequest(BaseModel):
    phone: str

class VerifyRequest(BaseModel):
    request_id: str
    code: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/send-code")
async def send_code(req: PhoneRequest):
    try:
        # Create a unique request tracker
        request_id = str(uuid.uuid4())
        
        # We use a StringSession to avoid lock-file issues with SQLite in a web server
        client = TelegramClient(StringSession(), int(API_ID), API_HASH)
        await client.connect()
        
        # Request the code from Telegram
        sent = await client.send_code_request(req.phone)
        
        # Store the client instance and verification data in memory
        login_pending[request_id] = {
            "client": client,
            "phone": req.phone,
            "phone_code_hash": sent.phone_code_hash
        }
        
        log.info(f"Code sent to {req.phone}. RequestID: {request_id}")
        return {"request_id": request_id}
        
    except Exception as e:
        log.error(f"Failed to send code: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/verify")
async def verify_code(req: VerifyRequest):
    if req.request_id not in login_pending:
        raise HTTPException(status_code=404, detail="Session expired or invalid request_id")
    
    data = login_pending[req.request_id]
    client = data["client"]
    
    try:
        # Complete the login
        await client.sign_in(
            phone=data["phone"],
            code=req.code,
            phone_code_hash=data["phone_code_hash"]
        )
        
        # Generate a unique session token for the frontend to hold
        session_id = str(uuid.uuid4())
        active_sessions[session_id] = client
        
        # Clean up the pending login
        del login_pending[req.request_id]
        
        log.info(f"User {data['phone']} verified successfully. SessionID: {session_id}")
        return {"session_id": session_id}
        
    except PhoneCodeInvalidError:
        raise HTTPException(status_code=400, detail="Invalid code")
    except Exception as e:
        log.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/chats/list")
async def list_chats(session_id: str):
    if session_id not in active_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized or Session Expired")
    
    client = active_sessions[session_id]
    try:
        from telethon.tl.types import Channel, Chat
        targets = []
        async for dialog in client.iter_dialogs():
            entity = dialog.entity
            if isinstance(entity, (Channel, Chat)):
                title_str = dialog.name or f"Unnamed [{dialog.id}]"
                targets.append({"id": dialog.id, "title": title_str})
        
        return {"chats": targets}
    except Exception as e:
        log.error(f"Failed to fetch chats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class CleanRequest(BaseModel):
    session_id: str
    chat_ids: List[int]

@app.post("/chats/clean")
async def clean_chats(req: CleanRequest, background_tasks: BackgroundTasks):
    if req.session_id not in active_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized or Session Expired")
    
    client = active_sessions[req.session_id]
    
    # We run the cleaning in the background so the user doesn't hit a timeout
    # while waiting for the rate-limited requests to finish.
    from app.cleaner import leave_chats
    background_tasks.add_task(leave_chats, client, req.chat_ids)
    
    return {"status": "started", "target_count": len(req.chat_ids)}

@app.post("/auth/logout")
async def logout(session_id: str):
    if session_id in active_sessions:
        client = active_sessions[session_id]
        await client.disconnect()
        del active_sessions[session_id]
        log.info(f"Session {session_id} destroyed.")
    return {"status": "logged_out"}

# Robust Frontend Discovery
possible_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),  # Local structure: backend/main.py
    os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist")),                      # Render root: ./frontend/dist
    os.path.abspath(os.path.join(os.getcwd(), "..", "frontend", "dist"))                 # Sibling: ../frontend/dist
]

frontend_path = None
for p in possible_paths:
    if os.path.exists(os.path.join(p, "index.html")):
        frontend_path = p
        break

if frontend_path:
    log.info(f"SUCCESS: Serving frontend from: {frontend_path}")
    # Mount assets (CSS/JS)
    assets_dir = os.path.join(frontend_path, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    @app.get("/")
    async def serve_home():
        return FileResponse(os.path.join(frontend_path, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith(("api/", "auth/", "chats/")):
             raise HTTPException(status_code=404)
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    log.error(f"CRITICAL ERROR: Could not find 'frontend/dist' in any of: {possible_paths}")

if __name__ == "__main__":
    import uvicorn
    # Use the PORT environment variable if available (required for Railway/Render)
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
