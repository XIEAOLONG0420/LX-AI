import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
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

# ----- Medications -----
@app.get("/api/medications")
def list_medications():
    db = SessionLocal()
    meds = db.query(Medication).all()
    db.close()
    return meds

@app.post("/api/medications")
def create_medication(m: MedicationCreate):
    db = SessionLocal()
    med = Medication(name=m.name, dosage=m.dosage, purpose=m.purpose, side_effects=m.side_effects, notes=m.notes)
    db.add(med); db.commit(); db.refresh(med); db.close()
    return med

@app.put("/api/medications/{med_id}")
def update_medication(med_id: int, m: MedicationUpdate):
    db = SessionLocal()
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med: db.close(); return {"error": "not found"}
    for k, v in m.model_dump(exclude_unset=True).items():
        setattr(med, k, v)
    db.commit(); db.refresh(med); db.close()
    return med

@app.delete("/api/medications/{med_id}")
def delete_medication(med_id: int):
    db = SessionLocal()
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if med: db.delete(med); db.commit()
    db.close()
    return {"deleted": True}

# ----- Reminders -----
@app.get("/api/reminders")
def list_reminders():
    db = SessionLocal()
    rems = db.query(ReminderConfig).all()
    db.close()
    return rems

@app.post("/api/reminders")
def create_reminder(r: ReminderCreate):
    from datetime import time
    h, mi = r.time.split(":")
    db = SessionLocal()
    rem = ReminderConfig(medication_id=r.medication_id, time=time(int(h), int(mi)), days=r.days, active=r.active)
    db.add(rem); db.commit(); db.refresh(rem); db.close()
    return rem

@app.put("/api/reminders/{rem_id}")
def update_reminder(rem_id: int, r: ReminderUpdate):
    from datetime import time
    db = SessionLocal()
    rem = db.query(ReminderConfig).filter(ReminderConfig.id == rem_id).first()
    if not rem: db.close(); return {"error": "not found"}
    data = r.model_dump(exclude_unset=True)
    if "time" in data:
        h, mi = data["time"].split(":")
        data["time"] = time(int(h), int(mi))
    for k, v in data.items(): setattr(rem, k, v)
    db.commit(); db.refresh(rem); db.close()
    return rem

@app.delete("/api/reminders/{rem_id}")
def delete_reminder(rem_id: int):
    db = SessionLocal()
    rem = db.query(ReminderConfig).filter(ReminderConfig.id == rem_id).first()
    if rem: db.delete(rem); db.commit()
    db.close()
    return {"deleted": True}

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

@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    import pathlib
    p = pathlib.Path(__file__).parent / "admin.html"
    return p.read_text(encoding="utf-8")
