
import csv
import os

from sqlalchemy import inspect

from app.database import engine, Base, SessionLocal
from app import models


DATA_DIR = os.path.join(
    os.path.dirname(__file__),
    "data",
    "organ_transplant"
)


def to_bool(value):
    if value is None:
        return None

    value = str(value).strip().lower()

    if value in ["true", "1", "yes"]:
        return True

    if value in ["false", "0", "no"]:
        return False

    return None


def load_csv(filename, model):
    path = os.path.join(DATA_DIR, filename)

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Missing file: {path}"
        )

    with open(path, "r", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    objects = []

    for row in rows:

        # Convert boolean fields
        boolean_fields = [
            "blood_group_compatible",
            "crossmatch_compatible",
            "size_compatible",
            "recipient_active",
            "recipient_consent_verified",
            "hospital_authorized",
            "hospital_ready",
            "medical_eligible",
            "blood_group_check",
            "crossmatch_check",
            "size_check",
            "urgency_factor",
            "waiting_time_factor",
            "distance_factor",
            "hospital_readiness_factor",
            "icu_available",
            "operating_theatre_available",
            "transplant_team_available",
        ]

        for key in boolean_fields:
            if key in row:
                row[key] = to_bool(row[key])

        # Convert integer fields
        integer_fields = [
            "age",
            "waiting_days",
            "experience_years",
        ]

        for key in integer_fields:
            if key in row and row[key] != "":
                row[key] = int(float(row[key]))

        # Convert float fields
        float_fields = [
            "height_cm",
            "weight_kg",
            "latitude",
            "longitude",
            "urgency_score",
            "waiting_time_score",
            "distance_km",
            "estimated_travel_minutes",
            "hospital_readiness_score",
            "priority_score",
        ]

        for key in float_fields:
            if key in row and row[key] != "":
                row[key] = float(row[key])

        # Convert empty values to None
        for key in row:
            if row[key] == "":
                row[key] = None

        objects.append(model(**row))

    return objects


def main():

    print("Checking database...")

    # Check whether the database already has tables
    inspector = inspect(engine)

    existing_tables = inspector.get_table_names()

    if existing_tables:
        print("Database already contains tables.")
        print("Seeding cancelled to protect existing data.")
        return

    datasets = [
        ("hospitals.csv", models.Hospital),
        ("staff.csv", models.Staff),
        ("donors.csv", models.Donor),
        ("recipients.csv", models.Recipient),
        ("organs.csv", models.Organ),
        ("organ_rules.csv", models.OrganRule),
        ("compatibility.csv", models.Compatibility),
        ("match_runs.csv", models.MatchRun),
    ]

    # Verify and prepare CSV data before creating tables
    print("Checking CSV datasets...")

    prepared_data = []

    for filename, model in datasets:
        objects = load_csv(filename, model)
        prepared_data.append((filename, objects))

    print("Creating database tables...")

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        for filename, objects in prepared_data:

            print(f"Loading {filename}...")

            db.add_all(objects)

            db.flush()

            print(f"  Loaded {len(objects)} records")

        db.commit()

        print("\nDatabase successfully seeded!")

    except Exception as e:
        db.rollback()

        print("\nERROR:", e)
        print("Database seeding failed.")

        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
