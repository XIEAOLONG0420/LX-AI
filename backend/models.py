from sqlalchemy import Column, Integer, String, Text, Time, Boolean, Date, Enum
from database import Base


class FamilyMember(Base):
    __tablename__ = "family_members"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    relation = Column(String, nullable=False)
    phone = Column(String, default="")
    wechat_id = Column(String, default="")
    sort_order = Column(Integer, default=0)


class Medication(Base):
    __tablename__ = "medications"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dosage = Column(String, default="")
    purpose = Column(Text, default="")
    side_effects = Column(Text, default="")
    notes = Column(Text, default="")


class ReminderConfig(Base):
    __tablename__ = "reminder_configs"
    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, nullable=False)
    time = Column(Time, nullable=False)
    days = Column(String, default="1,2,3,4,5,6,7")
    active = Column(Boolean, default=True)


class CheckIn(Base):
    __tablename__ = "check_ins"
    id = Column(Integer, primary_key=True, index=True)
    reminder_config_id = Column(Integer, nullable=False)
    check_date = Column(Date, nullable=False)
    check_time = Column(Time, nullable=False)
    status = Column(String, default="done")