from sqlalchemy import Column, Integer, String, Float, Boolean
from .database import Base


class Donor(Base):
    __tablename__ = "donors"

    donor_id = Column(String, primary_key=True, index=True)
    donor_type = Column(String)
    age = Column(Integer)
    sex = Column(String)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    blood_group = Column(String)
    cause_of_death_category = Column(String)
    medical_history_category = Column(String)
    consent_status = Column(String)
    verification_status = Column(String)
    hospital_id = Column(String)
    donor_status = Column(String)


class Recipient(Base):
    __tablename__ = "recipients"

    recipient_id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String)
    required_organ = Column(String)
    age = Column(Integer)
    sex = Column(String)
    blood_group = Column(String)
    registration_date = Column(String)
    waiting_days = Column(Integer)
    urgency_category = Column(String)
    medical_risk_level = Column(String)
    medical_history_category = Column(String)
    active_status = Column(String)
    consent_status = Column(String)


class Organ(Base):
    __tablename__ = "organs"

    organ_id = Column(String, primary_key=True, index=True)
    donor_id = Column(String)
    organ_type = Column(String)
    retrieval_datetime = Column(String)
    preservation_method = Column(String)
    organ_condition_category = Column(String)
    status = Column(String)
    current_hospital_id = Column(String)


class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id = Column(String, primary_key=True, index=True)
    hospital_name = Column(String)
    city = Column(String)
    state = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    hospital_type = Column(String)
    authorization_status = Column(String)
    transplant_center_status = Column(String)
    icu_available = Column(Boolean)
    operating_theatre_available = Column(Boolean)
    transplant_team_available = Column(Boolean)
    readiness_status = Column(String)


class Staff(Base):
    __tablename__ = "staff"

    staff_id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String)
    staff_role = Column(String)
    specialization = Column(String)
    experience_years = Column(Integer)
    availability_status = Column(String)


class Compatibility(Base):
    __tablename__ = "compatibility"

    compatibility_id = Column(String, primary_key=True, index=True)
    organ_id = Column(String)
    donor_id = Column(String)
    recipient_id = Column(String)
    organ_type = Column(String)
    donor_blood_group = Column(String)
    recipient_blood_group = Column(String)
    blood_group_compatible = Column(Boolean)
    crossmatch_status = Column(String)
    size_compatible = Column(Boolean)
    overall_compatibility = Column(String)


class OrganRule(Base):
    __tablename__ = "organ_rules"

    organ_type = Column(String, primary_key=True, index=True)
    blood_group_check = Column(Boolean)
    crossmatch_check = Column(Boolean)
    size_check = Column(Boolean)
    urgency_factor = Column(Boolean)
    waiting_time_factor = Column(Boolean)
    distance_factor = Column(Boolean)
    hospital_readiness_factor = Column(Boolean)


class MatchRun(Base):
    __tablename__ = "match_runs"

    match_id = Column(String, primary_key=True, index=True)
    organ_id = Column(String)
    donor_id = Column(String)
    recipient_id = Column(String)
    organ_type = Column(String)

    blood_group_compatible = Column(Boolean)
    crossmatch_compatible = Column(Boolean)
    size_compatible = Column(Boolean)

    recipient_active = Column(Boolean)
    recipient_consent_verified = Column(Boolean)

    hospital_authorized = Column(Boolean)
    hospital_ready = Column(Boolean)
    medical_eligible = Column(Boolean)

    urgency_score = Column(Float)
    waiting_time_score = Column(Float)
    distance_km = Column(Float)
    estimated_travel_minutes = Column(Float)
    hospital_readiness_score = Column(Float)

    priority_score = Column(Float)


# ==========================================================
# NOTIFICATIONS
# ==========================================================


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
        String,
        primary_key=True,
        index=True
    )

    organ_id = Column(String)
    match_id = Column(String)
    recipient_id = Column(String)
    hospital_id = Column(String)

    rank = Column(Integer)

    notification_type = Column(String)
    status = Column(String)

    sent_at = Column(String)
    expires_at = Column(String)
    expired_at = Column(String)
    responded_at = Column(String)

    response = Column(String)



# ==========================================================
# HOSPITAL CONTACTS
# ==========================================================

class HospitalContact(Base):
    __tablename__ = "hospital_contacts"

    contact_id = Column(
        String,
        primary_key=True,
        index=True
    )

    hospital_id = Column(String)
    contact_name = Column(String)
    email = Column(String)
    phone = Column(String)


# ==========================================================
# CLINICAL REVIEWS
# ==========================================================

class ClinicalReview(Base):
    __tablename__ = "clinical_reviews"

    review_id = Column(
        String,
        primary_key=True,
        index=True
    )

    organ_id = Column(String)
    recipient_id = Column(String)
    hospital_id = Column(String)
    rank = Column(Integer)
    status = Column(String)
    reviewed_by = Column(String)
    review_date = Column(String)
    decision = Column(String)
    remarks = Column(String)