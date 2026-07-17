import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import engine, Base, SessionLocal
from models import FamilyMember, Medication, ReminderConfig, CheckIn
from datetime import date, datetime
from typing import Optional, List, Any
from llm_service import call_deepseek, get_app_tools

Base.metadata.create_all(bind=engine)

app = FastAPI(title="????? API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Pydantic models -----
class FamilyMemberCreate(BaseModel):
    name: str
    relation: str
    phone: str = ""
    wechat_id: str = ""

class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    tools: Optional[List[Any]] = None

class ChatResponse(BaseModel):
    toolName: str
    toolArgs: Any

# ----- Health -----
@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}

# ----- Chat / LLM -----
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    messages = [m.model_dump() for m in req.messages]
    tools = req.tools if req.tools else get_app_tools()
    result = await call_deepseek(messages, tools)
    return result

# ----- Family Members -----
@app.get("/api/family-members")
def list_family():
    db = SessionLocal()
    members = db.query(FamilyMember).order_by(FamilyMember.sort_order).all()
    db.close()
    return members

@app.post("/api/family-members")
def create_family(m: FamilyMemberCreate):
    db = SessionLocal()
    member = FamilyMember(name=m.name, relation=m.relation, phone=m.phone, wechat_id=m.wechat_id)
    db.add(member)
    db.commit()
    db.refresh(member)
    db.close()
    return member

# ----- Reminders -----
@app.get("/api/reminders")
def list_reminders():
    db = SessionLocal()
    reminders = db.query(ReminderConfig).all()
    db.close()
    return reminders

# ----- Check-in -----
@app.post("/api/checkin/{reminder_id}")
def checkin(reminder_id: int):
    db = SessionLocal()
    check = CheckIn(
        reminder_config_id=reminder_id,
        check_date=date.today(),
        check_time=datetime.now().time(),
        status="done"
    )
    db.add(check)
    db.commit()
    db.close()
    return {"status": "ok", "checked": True}
