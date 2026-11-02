
from pydantic import BaseModel
from typing import Optional


class DonorCreate(BaseModel):
    donor_id: str
    donor_type: str
    age: int
    sex: str
    height_cm: float
    weight_kg: float
    blood_group: str
    cause_of_death_category: str
    medical_history_category: str
    consent_status: str
    verification_status: str
    hospital_id: str
    donor_status: str


class RecipientCreate(BaseModel):
    recipient_id: str
    hospital_id: str
    required_organ: str
    age: int
    sex: str
    blood_group: str
    registration_date: str
    waiting_days: int
    urgency_category: str
    medical_risk_level: str
    medical_history_category: str
    active_status: str
    consent_status: str


class OrganCreate(BaseModel):
    organ_id: str
    donor_id: str
    organ_type: str
    retrieval_datetime: str
    preservation_method: str
    organ_condition_category: str
    status: str
    current_hospital_id: str
    expiry_datetime: Optional[str] = None
    max_preservation_hours: Optional[float] = None


class OrganResponse(BaseModel):
    organ_id: str
    donor_id: str
    organ_type: str
    retrieval_datetime: str
    preservation_method: str
    organ_condition_category: str
    status: str
    current_hospital_id: str
    expiry_datetime: Optional[str] = None
    max_preservation_hours: Optional[float] = None

    class Config:
        from_attributes = True


# ==========================================================
# AUTHENTICATION SCHEMAS
# ==========================================================

class UserLogin(BaseModel):
    username: str
    password: str
    portal_type: Optional[str] = None  # "donor_hospital", "recipient_hospital", "admin"


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    role: str  # "donor_hospital" or "recipient_hospital"
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    full_name: str
    designation: Optional[str] = None


class UserOut(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    full_name: str
    designation: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
