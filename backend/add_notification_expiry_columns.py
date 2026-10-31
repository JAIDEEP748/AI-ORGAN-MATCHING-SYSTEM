
from sqlalchemy import inspect, text
from app.database import engine

inspector = inspect(engine)

columns = [
    column["name"]
    for column in inspector.get_columns("notifications")
]

with engine.begin() as connection:
    if "expires_at" not in columns:
        connection.execute(
            text(
                "ALTER TABLE notifications "
                "ADD COLUMN expires_at VARCHAR"
            )
        )
        print("Added expires_at column")
    else:
        print("expires_at already exists")

    if "expired_at" not in columns:
        connection.execute(
            text(
                "ALTER TABLE notifications "
                "ADD COLUMN expired_at VARCHAR"
            )
        )
        print("Added expired_at column")
    else:
        print("expired_at already exists")

print("Database migration completed successfully!")
