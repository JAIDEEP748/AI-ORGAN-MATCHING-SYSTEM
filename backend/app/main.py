from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, Query

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from .database import get_db, SessionLocal, engine, Base

from . import models, schemas

from .auth_routes import (
    router as auth_router,
    seed_default_users
)

from .ml_routes import (
    router as ml_router,
    rank_recipients
)

from .match_generator import (
    generate_match_runs_for_organ
)


app = FastAPI(
    title="AI Organ Matching API",
    description="Backend API for the AI-assisted organ matching prototype",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()


app.include_router(auth_router)
app.include_router(ml_router)



@app.get("/")
def root():
    return {
        "message": "AI Organ Matching API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ==========================================================
# DONORS
# ==========================================================

@app.get("/api/donors")
def get_donors(
    db: Session = Depends(get_db)
):
    return db.query(models.Donor).all()


@app.get("/api/donors/{donor_id}")
def get_donor(
    donor_id: str,
    db: Session = Depends(get_db)
):

    donor = (
        db.query(models.Donor)
        .filter(
            models.Donor.donor_id == donor_id
        )
        .first()
    )

    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found"
        )

    return donor


@app.post("/api/donors")
def create_donor(
    donor: schemas.DonorCreate,
    db: Session = Depends(get_db)
):

    existing = (
        db.query(models.Donor)
        .filter(
            models.Donor.donor_id
            == donor.donor_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Donor ID already exists"
        )

    new_donor = models.Donor(
        **donor.model_dump()
    )

    db.add(new_donor)
    db.commit()
    db.refresh(new_donor)

    return new_donor


# ==========================================================
# RECIPIENTS
# ==========================================================

@app.get("/api/recipients")
def get_recipients(
    db: Session = Depends(get_db)
):
    return db.query(models.Recipient).all()


@app.get("/api/recipients/{recipient_id}")
def get_recipient(
    recipient_id: str,
    db: Session = Depends(get_db)
):

    recipient = (
        db.query(models.Recipient)
        .filter(
            models.Recipient.recipient_id
            == recipient_id
        )
        .first()
    )

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found"
        )

    return recipient


@app.post("/api/recipients")
def create_recipient(
    recipient: schemas.RecipientCreate,
    db: Session = Depends(get_db)
):

    existing = (
        db.query(models.Recipient)
        .filter(
            models.Recipient.recipient_id
            == recipient.recipient_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Recipient ID already exists"
        )

    new_recipient = models.Recipient(
        **recipient.model_dump()
    )

    db.add(new_recipient)
    db.commit()
    db.refresh(new_recipient)

    return new_recipient


# ==========================================================
# ORGANS & EXPIRATION MANAGEMENT
# ==========================================================

ORGAN_PRESERVATION_HOURS = {
    "Heart": 4.0,
    "Lung": 6.0,
    "Liver": 12.0,
    "Kidney": 24.0,
    "Pancreas": 12.0,
    "Intestine": 8.0,
}


def get_max_preservation_hours(organ_type: str, preservation_method: str = "Cold_Storage") -> float:
    base = ORGAN_PRESERVATION_HOURS.get(organ_type, 12.0)
    if preservation_method == "Machine_Perfusion":
        if organ_type in ["Heart", "Lung"]:
            base += 2.0
        elif organ_type == "Kidney":
            base += 12.0
        else:
            base += 4.0
    return base


@app.get("/api/organs")
def get_organs(
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    organs = db.query(models.Organ).all()
    changed = False

    for organ in organs:
        if organ.status == "Available" and organ.expiry_datetime:
            try:
                exp = datetime.fromisoformat(organ.expiry_datetime.replace("Z", "+00:00"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if now >= exp:
                    organ.status = "Expired"
                    changed = True
            except Exception:
                pass

    if changed:
        db.commit()

    if available_only:
        return [o for o in organs if o.status == "Available"]

    return organs


@app.get("/api/organs/{organ_id}")
def get_organ(
    organ_id: str,
    db: Session = Depends(get_db)
):

    organ = (
        db.query(models.Organ)
        .filter(
            models.Organ.organ_id == organ_id
        )
        .first()
    )

    if not organ:
        raise HTTPException(
            status_code=404,
            detail="Organ not found"
        )

    return organ


@app.post("/api/organs")
def create_organ(
    organ: schemas.OrganCreate,
    db: Session = Depends(get_db)
):

    # ------------------------------------------------------
    # 1. Check whether organ already exists
    # ------------------------------------------------------

    existing = (
        db.query(models.Organ)
        .filter(
            models.Organ.organ_id
            == organ.organ_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Organ ID already exists"
        )

    # ------------------------------------------------------
    # 2. Check whether donor exists
    # ------------------------------------------------------

    donor = (
        db.query(models.Donor)
        .filter(
            models.Donor.donor_id
            == organ.donor_id
        )
        .first()
    )

    if not donor:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Donor '{organ.donor_id}' "
                "not found. Please register the donor "
                "before registering the organ."
            )
        )

    # ------------------------------------------------------
    # 3. Compute preservation hours & expiration timestamp
    # ------------------------------------------------------

    organ_data = organ.model_dump()
    max_h = organ.max_preservation_hours
    if not max_h:
        max_h = get_max_preservation_hours(organ.organ_type, organ.preservation_method)
    organ_data["max_preservation_hours"] = max_h

    if not organ.expiry_datetime:
        try:
            retrieval_dt = datetime.fromisoformat(organ.retrieval_datetime.replace("Z", "+00:00"))
            if retrieval_dt.tzinfo is None:
                retrieval_dt = retrieval_dt.replace(tzinfo=timezone.utc)
        except Exception:
            retrieval_dt = datetime.now(timezone.utc)
        expiry_dt = retrieval_dt + timedelta(hours=max_h)
        organ_data["expiry_datetime"] = expiry_dt.isoformat()

    # ------------------------------------------------------
    # 4. Create organ
    # ------------------------------------------------------

    new_organ = models.Organ(
        **organ_data
    )

    db.add(new_organ)
    db.commit()
    db.refresh(new_organ)

    # ------------------------------------------------------
    # 5. Generate match runs
    # ------------------------------------------------------

    match_run_result = (
        generate_match_runs_for_organ(
            db,
            new_organ
        )
    )

    # ------------------------------------------------------
    # 6. Automatically rank recipients
    # ------------------------------------------------------

    ranking_result = rank_recipients(
        new_organ.organ_id,
        db
    )

    # ------------------------------------------------------
    # 7. Return complete processing result
    # ------------------------------------------------------

    return {
        "organ": new_organ,
        "match_run_generation": match_run_result,
        "ranking": ranking_result
    }


@app.put("/api/organs/{organ_id}/expire")
def expire_organ(
    organ_id: str,
    db: Session = Depends(get_db)
):
    """
    Manually or automatically mark an organ as Expired and remove it from available matching.
    """
    organ = db.query(models.Organ).filter(models.Organ.organ_id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")
    
    organ.status = "Expired"
    db.commit()
    db.refresh(organ)
    return {
        "status": "success",
        "organ_id": organ_id,
        "organ_status": "Expired",
        "message": f"Organ {organ_id} marked as Expired and removed from active matching."
    }


@app.delete("/api/organs/{organ_id}")
def delete_organ(
    organ_id: str,
    db: Session = Depends(get_db)
):
    """
    Permanently delete or auto-remove an organ from the database inventory.
    """
    organ = db.query(models.Organ).filter(models.Organ.organ_id == organ_id).first()
    if not organ:
        raise HTTPException(status_code=404, detail="Organ not found")

    # Clean up associated match runs if needed
    db.query(models.MatchRun).filter(models.MatchRun.organ_id == organ_id).delete()
    db.delete(organ)
    db.commit()
    return {
        "status": "success",
        "deleted_organ_id": organ_id,
        "message": f"Organ {organ_id} has been completely removed from inventory."
    }


@app.post("/api/organs/check-expiration")
def check_all_organs_expiration(
    db: Session = Depends(get_db)
):
    """
    Scans all organs in real time and automatically marks any whose expire time is passed as 'Expired'.
    """
    now = datetime.now(timezone.utc)
    organs = db.query(models.Organ).all()
    expired_list = []

    for organ in organs:
        if organ.status == "Available" and organ.expiry_datetime:
            try:
                exp = datetime.fromisoformat(organ.expiry_datetime.replace("Z", "+00:00"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if now >= exp:
                    organ.status = "Expired"
                    expired_list.append(organ.organ_id)
            except Exception:
                pass

    if expired_list:
        db.commit()

    return {
        "checked_count": len(organs),
        "expired_count": len(expired_list),
        "expired_organ_ids": expired_list
    }

@app.put("/api/organs/{organ_id}/hospital")
def update_organ_hospital(
    organ_id: str,
    hospital_id: str,
    db: Session = Depends(get_db)
):
    organ = (
        db.query(models.Organ)
        .filter(
            models.Organ.organ_id == organ_id
        )
        .first()
    )

    if not organ:
        raise HTTPException(
            status_code=404,
            detail=f"Organ '{organ_id}' not found"
        )

    hospital = (
        db.query(models.Hospital)
        .filter(
            models.Hospital.hospital_id == hospital_id
        )
        .first()
    )

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail=f"Hospital '{hospital_id}' not found"
        )

    organ.current_hospital_id = hospital_id

    db.commit()
    db.refresh(organ)

    return {
        "success": True,
        "message": "Organ hospital updated successfully",
        "organ_id": organ.organ_id,
        "current_hospital_id": organ.current_hospital_id
    }

# ==========================================================
# HOSPITALS
# ==========================================================

@app.get("/api/hospitals")
def get_hospitals(
    db: Session = Depends(get_db)
):
    return db.query(models.Hospital).all()


class HospitalReadinessUpdate(schemas.BaseModel):
    icu_available: bool | None = None
    operating_theatre_available: bool | None = None
    transplant_team_available: bool | None = None


@app.put("/api/hospitals/{hospital_id}/readiness")
def update_hospital_readiness(
    hospital_id: str,
    update: HospitalReadinessUpdate,
    db: Session = Depends(get_db)
):
    hospital = db.query(models.Hospital).filter(
        models.Hospital.hospital_id == hospital_id
    ).first()

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail=f"Hospital '{hospital_id}' not found"
        )

    if update.icu_available is not None:
        hospital.icu_available = update.icu_available
    if update.operating_theatre_available is not None:
        hospital.operating_theatre_available = update.operating_theatre_available
    if update.transplant_team_available is not None:
        hospital.transplant_team_available = update.transplant_team_available

    all_ready = bool(
        hospital.icu_available and
        hospital.operating_theatre_available and
        hospital.transplant_team_available
    )
    hospital.readiness_status = "Ready" if all_ready else "Partially_Ready"

    db.commit()
    db.refresh(hospital)

    return hospital



# ==========================================================
# STAFF
# ==========================================================

@app.get("/api/staff")
def get_staff(
    db: Session = Depends(get_db)
):
    return db.query(models.Staff).all()


# ==========================================================
# COMPATIBILITY
# ==========================================================

@app.get("/api/compatibility")
def get_compatibility(
    db: Session = Depends(get_db)
):
    return db.query(
        models.Compatibility
    ).all()


# ==========================================================
# ORGAN RULES
# ==========================================================

@app.get("/api/organ-rules")
def get_organ_rules(
    db: Session = Depends(get_db)
):
    return db.query(
        models.OrganRule
    ).all()


# ==========================================================
# MATCH RUNS
# ==========================================================

@app.get("/api/match-runs")
def get_match_runs(
    db: Session = Depends(get_db)
):
    return db.query(
        models.MatchRun
    ).all()


# ==========================================================
# REGENERATE MATCH RUNS
# ==========================================================

@app.post("/api/match-runs/generate/{organ_id}")
def regenerate_match_runs(
    organ_id: str,
    db: Session = Depends(get_db)
):

    """
    Regenerate match runs for an existing organ.

    This endpoint is useful when an existing organ has
    no match-run records or when the matching logic has
    been updated.

    It does not create a new organ.
    """

    organ = (
        db.query(models.Organ)
        .filter(
            models.Organ.organ_id == organ_id
        )
        .first()
    )

    if not organ:
        raise HTTPException(
            status_code=404,
            detail="Organ not found"
        )

    result = generate_match_runs_for_organ(
        db,
        organ
    )

    return {
        "organ_id": organ.organ_id,
        "organ_type": organ.organ_type,
        "match_run_generation": result
    }