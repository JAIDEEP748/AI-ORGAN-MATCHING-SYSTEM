
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import logging

from .database import get_db
from . import models
from .ml_model import model, explainer
from .email_service import send_email

logger = logging.getLogger(__name__)

OFFER_RESPONSE_MINUTES = 5

router = APIRouter(
    prefix="/api/ml",
    tags=["Machine Learning"]
)


def utc_now():
    return datetime.now(timezone.utc)


def utc_timestamp():
    return utc_now().isoformat()


def parse_utc(value):
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


class PriorityPredictionRequest(BaseModel):
    urgency_score: float
    waiting_time_score: float
    distance_km: float
    hospital_readiness_score: float


class NotificationResponseRequest(BaseModel):
    response: str


class ClinicalReviewDecisionRequest(BaseModel):
    reviewed_by: str
    decision: str
    remarks: str | None = None


@router.post("/predict")
def predict_priority(request: PriorityPredictionRequest):
    features = [[
        request.urgency_score,
        request.waiting_time_score,
        request.distance_km,
        request.hospital_readiness_score
    ]]
    prediction = model.predict(features)[0]
    return {"priority_score": float(prediction)}


# ==========================================================
# ML RANKING HELPERS
# ==========================================================

def get_ranked_candidates(db: Session, organ_id: str):
    match_runs = db.query(models.MatchRun).filter(
        models.MatchRun.organ_id == organ_id
    ).all()

    eligible_runs = []

    for run in match_runs:
        if not all([
            run.blood_group_compatible,
            run.crossmatch_compatible,
            run.size_compatible,
            run.recipient_active,
            run.recipient_consent_verified,
            run.hospital_authorized,
            run.medical_eligible
        ]):
            continue

        eligible_runs.append(run)

    if not eligible_runs:
        return []

    feature_rows = [
        [
            run.urgency_score,
            run.waiting_time_score,
            run.distance_km,
            run.hospital_readiness_score
        ]
        for run in eligible_runs
    ]

    predictions = model.predict(feature_rows)
    shap_values = explainer.shap_values(feature_rows)

    candidates = []

    for index, (run, prediction) in enumerate(
        zip(eligible_runs, predictions)
    ):
        recipient = db.query(models.Recipient).filter(
            models.Recipient.recipient_id == run.recipient_id
        ).first()

        candidate_shap = shap_values[index]

        candidates.append({
            "match_id": run.match_id,
            "recipient_id": run.recipient_id,
            "organ_id": run.organ_id,
            "organ_type": run.organ_type,
            "urgency_score": run.urgency_score,
            "waiting_time_score": run.waiting_time_score,
            "distance_km": run.distance_km,
            "hospital_readiness_score":
                run.hospital_readiness_score,
            "predicted_priority_score": float(prediction),
            "shap_explanation": {
                "urgency_score": float(candidate_shap[0]),
                "waiting_time_score": float(candidate_shap[1]),
                "distance_km": float(candidate_shap[2]),
                "hospital_readiness_score":
                    float(candidate_shap[3])
            },
            "recipient": {
                "age": recipient.age if recipient else None,
                "sex": recipient.sex if recipient else None,
                "blood_group":
                    recipient.blood_group if recipient else None,
                "urgency_category":
                    recipient.urgency_category if recipient else None
            }
        })

    candidates.sort(
        key=lambda item: (
            -item["predicted_priority_score"],
            item["recipient_id"]
        )
    )

    for index, candidate in enumerate(candidates, start=1):
        candidate["rank"] = index

    return candidates


def find_next_ranked_candidate(
    db: Session,
    organ_id: str,
    current_rank: int
):
    candidates = get_ranked_candidates(db, organ_id)

    for candidate in candidates:
        if candidate["rank"] > current_rank:
            return candidate

    return None


# ==========================================================
# NOTIFICATION CREATION
# ==========================================================

def send_ranked_hospital_notification(
    db: Session,
    organ,
    candidate
):
    recipient_id = candidate["recipient_id"]
    match_id = candidate["match_id"]
    rank = candidate["rank"]

    recipient = db.query(models.Recipient).filter(
        models.Recipient.recipient_id == recipient_id
    ).first()

    if not recipient:
        return {
            "success": False,
            "status": "Failed",
            "message": "Recipient not found",
            "rank": rank
        }

    hospital = db.query(models.Hospital).filter(
        models.Hospital.hospital_id == recipient.hospital_id
    ).first()

    if not hospital:
        return {
            "success": False,
            "status": "Failed",
            "message": "Hospital not found",
            "rank": rank
        }

    existing_notification = db.query(models.Notification).filter(
        models.Notification.organ_id == organ.organ_id,
        models.Notification.match_id == match_id,
        models.Notification.rank == rank
    ).first()

    if existing_notification:
        return {
            "success": True,
            "status": "Already Exists",
            "message": "Notification already exists",
            "notification_id":
                existing_notification.notification_id,
            "hospital_id": existing_notification.hospital_id,
            "hospital_name": hospital.hospital_name,
            "rank": rank
        }

    current_time = utc_now()
    deadline = current_time + timedelta(
        minutes=OFFER_RESPONSE_MINUTES
    )

    # Dashboard notification is created first.
    # Email delivery is not required for the offer to exist.
    notification = models.Notification(
        notification_id=(
            "NOTIF-" +
            datetime.now().strftime("%Y%m%d%H%M%S%f")
        ),
        organ_id=organ.organ_id,
        match_id=match_id,
        recipient_id=recipient.recipient_id,
        hospital_id=hospital.hospital_id,
        rank=rank,
        notification_type="Organ Offer",
        status="Sent",
        sent_at=current_time.isoformat(),
        expires_at=deadline.isoformat(),
        expired_at=None,
        responded_at=None,
        response=None
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    logger.info(
        "Dashboard offer created: organ=%s rank=%s hospital=%s",
        organ.organ_id,
        rank,
        hospital.hospital_id
    )

    contact = db.query(models.HospitalContact).filter(
        models.HospitalContact.hospital_id == hospital.hospital_id
    ).first()

    email_status = "Not Sent"
    email_message = "No hospital email configured"

    if contact and contact.email:
        subject = (
            f"Organ Offer Notification - "
            f"{organ.organ_type} - Rank {rank}"
        )

        body = f"""
Dear {contact.contact_name or 'Hospital Team'},

An organ offer is available in the AI Organ Matching
student prototype.

Organ ID: {organ.organ_id}
Organ Type: {organ.organ_type}
Recipient ID: {recipient.recipient_id}
Candidate Rank: {rank}
Priority Score: {candidate['predicted_priority_score']:.6f}

Hospital: {hospital.hospital_name}
Hospital ID: {hospital.hospital_id}

Please respond within {OFFER_RESPONSE_MINUTES} minutes.

Offer deadline (UTC): {deadline.isoformat()}

This is a student academic prototype only.
It is not a clinical instruction or official allocation.

Any actual transplant decision requires appropriate
clinical review and authorization.

Regards,
AI Organ Matching System
"""

        try:
            email_result = send_email(
                recipient_email=contact.email,
                subject=subject,
                body=body
            )
            if email_result.get("success"):
                email_status = "Sent"
                email_message = "Email delivered"
            else:
                email_status = "Failed"
                email_message = email_result.get(
                    "message", "Email delivery failed"
                )
        except Exception as exc:
            email_status = "Failed"
            email_message = str(exc)
            logger.exception("Hospital email delivery failed")

    return {
        "success": True,
        "status": "Sent",
        "message": "Hospital dashboard offer created",
        "notification_id": notification.notification_id,
        "hospital_id": hospital.hospital_id,
        "hospital_name": hospital.hospital_name,
        "rank": rank,
        "expires_at": notification.expires_at,
        "email_status": email_status,
        "email_message": email_message
    }


def notify_rank_one_hospital(db, organ, rank_one_candidate):
    return send_ranked_hospital_notification(
        db, organ, rank_one_candidate
    )


def notify_next_rank(db, organ_id, current_rank):
    organ = db.query(models.Organ).filter(
        models.Organ.organ_id == organ_id
    ).first()

    if not organ or organ.status != "Available":
        return None

    candidates = get_ranked_candidates(db, organ_id)

    for candidate in candidates:
        if candidate["rank"] <= current_rank:
            continue

        result = send_ranked_hospital_notification(
            db, organ, candidate
        )

        logger.info(
            "Next rank notification: organ=%s rank=%s result=%s",
            organ_id,
            candidate["rank"],
            result
        )

        # An existing notification is not a fresh offer.
        # Do not reopen it or restart its timer.
        if result.get("status") == "Already Exists":
            existing = db.query(models.Notification).filter(
                models.Notification.notification_id ==
                    result["notification_id"]
            ).first()

            if existing and existing.status == "Sent":
                deadline = parse_utc(existing.expires_at)
                if (
                    existing.response is None
                    and deadline
                    and utc_now() < deadline
                ):
                    return result

            continue

        if result.get("success"):
            return result

    return None


# ==========================================================
# AUTOMATIC EXPIRY
# ==========================================================

def process_expired_notifications(db: Session):
    now = utc_now()

    pending = db.query(models.Notification).filter(
        models.Notification.status == "Sent",
        models.Notification.response.is_(None),
        models.Notification.expires_at.isnot(None)
    ).all()

    expired_count = 0
    forwarded = []

    for item in pending:
        deadline = parse_utc(item.expires_at)

        if deadline is None or now < deadline:
            continue

        organ_id = item.organ_id
        current_rank = item.rank

        changed = db.query(models.Notification).filter(
            models.Notification.notification_id ==
                item.notification_id,
            models.Notification.status == "Sent",
            models.Notification.response.is_(None),
            models.Notification.expires_at == item.expires_at
        ).update({
            "status": "Expired",
            "expired_at": now.isoformat()
        }, synchronize_session=False)

        db.commit()

        if not changed:
            continue

        expired_count += 1

        logger.info(
            "Offer expired: organ=%s rank=%s",
            organ_id,
            current_rank
        )

        result = notify_next_rank(
            db, organ_id, current_rank
        )

        forwarded.append({
            "organ_id": organ_id,
            "expired_rank": current_rank,
            "next_notification": result
        })

    return {
        "expired_count": expired_count,
        "forwarded": forwarded
    }


# ==========================================================
# HOSPITAL ACCEPT / REJECT
# ==========================================================

@router.post("/notification/{notification_id}/respond")
def respond_to_notification(
    notification_id: str,
    request: NotificationResponseRequest,
    db: Session = Depends(get_db)
):
    response = request.response.strip().upper()

    if response not in ("ACCEPT", "REJECT"):
        raise HTTPException(
            status_code=400,
            detail="Response must be ACCEPT or REJECT"
        )

    notification = db.query(models.Notification).filter(
        models.Notification.notification_id == notification_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    if notification.status != "Sent" or notification.response:
        raise HTTPException(
            status_code=409,
            detail="This offer is no longer open"
        )

    now = utc_now()
    deadline = parse_utc(notification.expires_at)

    if deadline is None:
        raise HTTPException(
            status_code=409,
            detail="Offer has no active deadline"
        )

    if now >= deadline:
        process_expired_notifications(db)
        raise HTTPException(
            status_code=409,
            detail="Offer expired. Response not accepted"
        )

    organ = db.query(models.Organ).filter(
        models.Organ.organ_id == notification.organ_id
    ).first()

    if not organ or organ.status != "Available":
        raise HTTPException(
            status_code=409,
            detail="Organ is no longer available"
        )

    changed = db.query(models.Notification).filter(
        models.Notification.notification_id == notification_id,
        models.Notification.status == "Sent",
        models.Notification.response.is_(None),
        models.Notification.expires_at == notification.expires_at
    ).update({
        "response": response,
        "responded_at": now.isoformat(),
        "status": "Responded"
    }, synchronize_session=False)

    db.commit()

    if not changed:
        raise HTTPException(
            status_code=409,
            detail="Offer was already processed"
        )

    if response == "ACCEPT":
        clinical_review = models.ClinicalReview(
            review_id=(
                "CR-" +
                datetime.now().strftime("%Y%m%d%H%M%S%f")
            ),
            organ_id=notification.organ_id,
            recipient_id=notification.recipient_id,
            hospital_id=notification.hospital_id,
            rank=notification.rank,
            status="Pending Review",
            reviewed_by=None,
            review_date=None,
            decision="Pending",
            remarks=None
        )

        db.add(clinical_review)
        db.commit()
        db.refresh(clinical_review)

        return {
            "success": True,
            "message": (
                "Hospital accepted the offer; "
                "awaiting human clinical review"
            ),
            "next_action": "Human clinical review",
            "notification_id": notification.notification_id,
            "organ_id": notification.organ_id,
            "recipient_id": notification.recipient_id,
            "hospital_id": notification.hospital_id,
            "rank": notification.rank,
            "status": "Responded",
            "response": response,
            "responded_at": now.isoformat(),
            "clinical_review": {
                "review_id": clinical_review.review_id,
                "organ_id": clinical_review.organ_id,
                "recipient_id": clinical_review.recipient_id,
                "hospital_id": clinical_review.hospital_id,
                "rank": clinical_review.rank,
                "status": clinical_review.status,
                "decision": clinical_review.decision
            }
        }

    next_result = notify_next_rank(
        db, notification.organ_id, notification.rank
    )

    return {
        "success": True,
        "message": "Hospital rejected the offer",
        "notification_id": notification.notification_id,
        "response": response,
        "rejected_notification": {
            "notification_id": notification.notification_id,
            "hospital_id": notification.hospital_id,
            "rank": notification.rank,
            "response": response,
            "status": "Responded"
        },
        "next_notification": next_result
    }


# ==========================================================
# RANK RECIPIENTS
# ==========================================================

@router.get("/rank/{organ_id}")
def rank_recipients(
    organ_id: str,
    db: Session = Depends(get_db)
):
    organ = db.query(models.Organ).filter(
        models.Organ.organ_id == organ_id
    ).first()

    if not organ:
        raise HTTPException(
            status_code=404,
            detail="Organ not found"
        )

    if organ.status != "Available":
        return {
            "organ_id": organ_id,
            "organ_type": organ.organ_type,
            "status": organ.status,
            "candidates": [],
            "message": "Organ is not currently available"
        }

    match_runs = db.query(models.MatchRun).filter(
        models.MatchRun.organ_id == organ_id
    ).all()

    if not match_runs:
        return {
            "organ_id": organ_id,
            "organ_type": organ.organ_type,
            "candidates": [],
            "message": "No match-run records found for this organ"
        }

    candidates = get_ranked_candidates(db, organ_id)

    if not candidates:
        return {
            "organ_id": organ_id,
            "organ_type": organ.organ_type,
            "candidates": [],
            "message": "No eligible recipients found"
        }

    notification_result = notify_rank_one_hospital(
        db, organ, candidates[0]
    )

    return {
        "organ_id": organ_id,
        "organ_type": organ.organ_type,
        "candidate_count": len(candidates),
        "candidates": candidates,
        "rank_one_notification": notification_result
    }


# ==========================================================
# FINALIZE APPROVED ALLOCATION
# ==========================================================

def finalize_approved_allocation(db: Session, clinical_review):
    organ = db.query(models.Organ).filter(
        models.Organ.organ_id == clinical_review.organ_id
    ).first()

    if not organ:
        raise HTTPException(
            status_code=404,
            detail="Organ not found for clinical review"
        )

    recipient = db.query(models.Recipient).filter(
        models.Recipient.recipient_id ==
            clinical_review.recipient_id
    ).first()

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found for clinical review"
        )

    hospital = db.query(models.Hospital).filter(
        models.Hospital.hospital_id ==
            clinical_review.hospital_id
    ).first()

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found for clinical review"
        )

    organ.status = "Allocated"
    recipient.active_status = "Allocated"
    organ.current_hospital_id = clinical_review.hospital_id

    open_notifications = db.query(models.Notification).filter(
        models.Notification.organ_id == clinical_review.organ_id,
        models.Notification.status == "Sent"
    ).all()

    for notification in open_notifications:
        notification.status = "Closed"

    db.commit()
    db.refresh(organ)
    db.refresh(recipient)

    return {
        "organ_id": organ.organ_id,
        "organ_status": organ.status,
        "current_hospital_id": organ.current_hospital_id,
        "current_hospital_name": hospital.hospital_name,
        "recipient_id": recipient.recipient_id,
        "recipient_status": recipient.active_status,
        "allocation_status": "Final Allocation Completed"
    }


# ==========================================================
# HOSPITAL DASHBOARD NOTIFICATIONS
# ==========================================================

@router.get("/notifications/hospital/{hospital_id}")
def get_hospital_notifications(
    hospital_id: str,
    db: Session = Depends(get_db)
):
    process_expired_notifications(db)

    hospital = db.query(models.Hospital).filter(
        models.Hospital.hospital_id == hospital_id
    ).first()

    if not hospital:
        raise HTTPException(
            status_code=404,
            detail="Hospital not found"
        )

    notifications = db.query(models.Notification).filter(
        models.Notification.hospital_id == hospital_id
    ).order_by(
        models.Notification.sent_at.desc()
    ).all()

    offers = []

    for notification in notifications:
        organ = db.query(models.Organ).filter(
            models.Organ.organ_id == notification.organ_id
        ).first()

        recipient = db.query(models.Recipient).filter(
            models.Recipient.recipient_id ==
                notification.recipient_id
        ).first()

        deadline = parse_utc(notification.expires_at)

        can_respond = (
            notification.status == "Sent"
            and notification.response is None
            and deadline is not None
            and utc_now() < deadline
            and organ is not None
            and organ.status == "Available"
        )

        offers.append({
            "notification_id": notification.notification_id,
            "organ_id": notification.organ_id,
            "match_id": notification.match_id,
            "recipient_id": notification.recipient_id,
            "hospital_id": notification.hospital_id,
            "rank": notification.rank,
            "notification_type": notification.notification_type,
            "status": notification.status,
            "response": notification.response,
            "sent_at": notification.sent_at,
            "responded_at": notification.responded_at,
            "expires_at": notification.expires_at,
            "expired_at": notification.expired_at,
            "organ_type": organ.organ_type if organ else None,
            "organ_blood_group": None,
            "recipient_blood_group":
                recipient.blood_group if recipient else None,
            "recipient_urgency":
                recipient.urgency_category if recipient else None,
            "can_respond": can_respond
        })

    return {
        "success": True,
        "hospital_id": hospital_id,
        "hospital_name": hospital.hospital_name,
        "offer_count": len(offers),
        "offers": offers
    }


# ==========================================================
# PENDING CLINICAL REVIEWS
# ==========================================================

@router.get("/clinical-reviews/pending")
def get_pending_clinical_reviews(
    db: Session = Depends(get_db)
):
    reviews = db.query(models.ClinicalReview).filter(
        models.ClinicalReview.status == "Pending Review"
    ).all()

    return {
        "success": True,
        "review_count": len(reviews),
        "reviews": [
            {
                "review_id": review.review_id,
                "organ_id": review.organ_id,
                "recipient_id": review.recipient_id,
                "hospital_id": review.hospital_id,
                "rank": review.rank,
                "status": review.status,
                "reviewed_by": review.reviewed_by,
                "review_date": review.review_date,
                "decision": review.decision,
                "remarks": review.remarks
            }
            for review in reviews
        ]
    }


# ==========================================================
# CLINICAL REVIEW DECISION
# ==========================================================

@router.post("/clinical-reviews/{review_id}/decision")
def submit_clinical_review_decision(
    review_id: str,
    request: ClinicalReviewDecisionRequest,
    db: Session = Depends(get_db)
):
    decision = request.decision.strip().upper()

    if decision not in ("APPROVED", "NOT APPROVED"):
        raise HTTPException(
            status_code=400,
            detail="Decision must be APPROVED or NOT APPROVED"
        )

    clinical_review = db.query(models.ClinicalReview).filter(
        models.ClinicalReview.review_id == review_id
    ).first()

    if not clinical_review:
        raise HTTPException(
            status_code=404,
            detail="Clinical review not found"
        )

    if clinical_review.status == "Completed":
        raise HTTPException(
            status_code=400,
            detail="This clinical review has already been completed"
        )

    reviewer = request.reviewed_by.strip()

    if not reviewer:
        raise HTTPException(
            status_code=400,
            detail="reviewed_by cannot be empty"
        )

    clinical_review.reviewed_by = reviewer
    clinical_review.review_date = datetime.now().isoformat()
    clinical_review.decision = decision
    clinical_review.remarks = request.remarks
    clinical_review.status = "Completed"

    db.commit()
    db.refresh(clinical_review)

    if decision == "APPROVED":
        allocation = finalize_approved_allocation(
            db, clinical_review
        )

        return {
            "success": True,
            "message": (
                "Clinical review approved and "
                "organ allocation finalized"
            ),
            "next_action": "Allocation finalized",
            "clinical_review": {
                "review_id": clinical_review.review_id,
                "organ_id": clinical_review.organ_id,
                "recipient_id": clinical_review.recipient_id,
                "hospital_id": clinical_review.hospital_id,
                "rank": clinical_review.rank,
                "status": clinical_review.status,
                "reviewed_by": clinical_review.reviewed_by,
                "review_date": clinical_review.review_date,
                "decision": clinical_review.decision,
                "remarks": clinical_review.remarks
            },
            "allocation": allocation
        }

    next_result = notify_next_rank(
        db,
        clinical_review.organ_id,
        clinical_review.rank
    )

    return {
        "success": True,
        "message": (
            "Clinical review was not approved; "
            "next ranked hospital processing completed"
        ),
        "next_action": (
            "Next ranked hospital notification"
            if next_result else "No further ranked candidate"
        ),
        "clinical_review": {
            "review_id": clinical_review.review_id,
            "organ_id": clinical_review.organ_id,
            "recipient_id": clinical_review.recipient_id,
            "hospital_id": clinical_review.hospital_id,
            "rank": clinical_review.rank,
            "status": clinical_review.status,
            "reviewed_by": clinical_review.reviewed_by,
            "review_date": clinical_review.review_date,
            "decision": clinical_review.decision,
            "remarks": clinical_review.remarks
        },
        "next_notification": next_result
    }
