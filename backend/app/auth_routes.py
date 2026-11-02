import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from .database import get_db
from . import models, schemas

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication & Authorization"]
)

SECRET_KEY = os.environ.get(
    "JWT_SECRET",
    "organ-matching-secure-jwt-key-notto-2026-auth-system"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


# ==========================================================
# PASSWORD HASHING HELPERS
# ==========================================================

def generate_salt() -> str:
    return os.urandom(16).hex()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = generate_salt()
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        100000
    ).hex()
    return pw_hash, salt


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    pw_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(pw_hash, expected_hash)


# ==========================================================
# JWT TOKEN HELPERS
# ==========================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


# ==========================================================
# AUTH DEPENDENCY
# ==========================================================

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided."
        )

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload."
        )

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token was not found."
        )

    return user


# ==========================================================
# SEED DEFAULT USERS
# ==========================================================

def seed_default_users(db: Session):
    """
    Seeds default accounts for Donor Hospital, Recipient Hospital,
    and Admin if not already present.
    """
    # Ensure tables exist
    from .database import engine, Base
    Base.metadata.create_all(bind=engine)

    defaults = [
        {
            "user_id": "USR-DONOR-001",
            "username": "donor_hospital",
            "email": "donor@choudhury.org",
            "password": "donor123",
            "role": "donor_hospital",
            "hospital_id": "H0001",
            "hospital_name": "Choudhury Transplant Centre",
            "full_name": "Dr. Rajesh Choudhury",
            "designation": "Chief Donor Coordinator & Procurement Officer"
        },
        {
            "user_id": "USR-RECIPIENT-001",
            "username": "recipient_hospital",
            "email": "recipient@bakshi.org",
            "password": "recipient123",
            "role": "recipient_hospital",
            "hospital_id": "H0002",
            "hospital_name": "Bakshi Transplant Centre",
            "full_name": "Dr. Sunita Bakshi",
            "designation": "Transplant Surgeon & Recipient Coordinator"
        },
        {
            "user_id": "USR-ADMIN-001",
            "username": "admin",
            "email": "admin@notto.gov.in",
            "password": "admin123",
            "role": "admin",
            "hospital_id": None,
            "hospital_name": "National Organ Allocation Registry",
            "full_name": "NOTTO Central Director",
            "designation": "Central Regulatory Administrator"
        }
    ]

    for item in defaults:
        existing = db.query(models.User).filter(
            (models.User.username == item["username"]) |
            (models.User.email == item["email"])
        ).first()

        if not existing:
            pw_hash, salt = hash_password(item["password"])
            user = models.User(
                user_id=item["user_id"],
                username=item["username"],
                email=item["email"],
                password_hash=pw_hash,
                salt=salt,
                role=item["role"],
                hospital_id=item["hospital_id"],
                hospital_name=item["hospital_name"],
                full_name=item["full_name"],
                designation=item["designation"],
                created_at=datetime.now(timezone.utc).isoformat()
            )
            db.add(user)

    db.commit()


# ==========================================================
# ENDPOINTS
# ==========================================================

@router.post("/login", response_model=schemas.LoginResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with portal-specific verification:
    Ensures that Donor Hospital and Recipient Hospital access
    are segregated appropriately.
    """
    username_or_email = login_data.username.strip()

    user = db.query(models.User).filter(
        (models.User.username.ilike(username_or_email)) |
        (models.User.email.ilike(username_or_email))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    if not verify_password(login_data.password, user.salt, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    # Portal separation verification
    portal = login_data.portal_type
    if portal:
        if portal == "donor_hospital" and user.role == "recipient_hospital":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This account belongs to a Recipient Hospital. Please use the Recipient Hospital Login Portal."
            )
        elif portal == "recipient_hospital" and user.role == "donor_hospital":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This account belongs to a Donor Hospital. Please use the Donor Hospital Login Portal."
            )

    token_data = {
        "sub": user.user_id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "hospital_id": user.hospital_id,
        "hospital_name": user.hospital_name,
        "full_name": user.full_name
    }
    access_token = create_access_token(token_data)

    return schemas.LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(user)
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Return the profile of the currently signed-in user."""
    return schemas.UserOut.model_validate(current_user)


@router.post("/register", response_model=schemas.LoginResponse)
def register(reg_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new hospital staff coordinator for either donor or recipient side."""
    if reg_data.role not in ["donor_hospital", "recipient_hospital"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'donor_hospital' or 'recipient_hospital'."
        )

    existing_username = db.query(models.User).filter(
        models.User.username == reg_data.username.strip()
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken."
        )

    existing_email = db.query(models.User).filter(
        models.User.email == reg_data.email.strip().lower()
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # Look up hospital name if provided
    hospital_name = reg_data.hospital_name
    if reg_data.hospital_id and not hospital_name:
        hosp = db.query(models.Hospital).filter(
            models.Hospital.hospital_id == reg_data.hospital_id
        ).first()
        if hosp:
            hospital_name = hosp.hospital_name

    pw_hash, salt = hash_password(reg_data.password)
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"

    new_user = models.User(
        user_id=user_id,
        username=reg_data.username.strip(),
        email=reg_data.email.strip().lower(),
        password_hash=pw_hash,
        salt=salt,
        role=reg_data.role,
        hospital_id=reg_data.hospital_id,
        hospital_name=hospital_name,
        full_name=reg_data.full_name.strip(),
        designation=reg_data.designation or (
            "Donor Coordinator" if reg_data.role == "donor_hospital" else "Recipient Coordinator"
        ),
        created_at=datetime.now(timezone.utc).isoformat()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_data = {
        "sub": new_user.user_id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
        "hospital_id": new_user.hospital_id,
        "hospital_name": new_user.hospital_name,
        "full_name": new_user.full_name
    }
    access_token = create_access_token(token_data)

    return schemas.LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserOut.model_validate(new_user)
    )


@router.get("/hospitals")
def get_auth_hospitals(db: Session = Depends(get_db)):
    """Get active hospitals for login/registration selection."""
    hospitals = db.query(models.Hospital).all()
    return [
        {
            "hospital_id": h.hospital_id,
            "hospital_name": h.hospital_name,
            "city": h.city,
            "state": h.state,
            "hospital_type": h.hospital_type,
            "authorization_status": h.authorization_status,
            "readiness_status": h.readiness_status,
            "icu_available": h.icu_available,
            "operating_theatre_available": h.operating_theatre_available,
            "transplant_team_available": h.transplant_team_available
        }
        for h in hospitals
    ]


class ChangePasswordRequest(schemas.BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's password."""
    if not verify_password(req.current_password, current_user.salt, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters."
        )

    pw_hash, salt = hash_password(req.new_password)
    current_user.password_hash = pw_hash
    current_user.salt = salt
    db.commit()

    return {"message": "Password updated successfully."}

