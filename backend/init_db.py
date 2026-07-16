from database import engine, Base
from models import FamilyMember, Medication, ReminderConfig, CheckIn

Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")