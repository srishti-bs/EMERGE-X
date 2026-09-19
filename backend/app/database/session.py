"""Database Connection and Session Management.

Phase 5: MVP Emergency Priority & Moving Green Corridor.
Engine: SQLite via SQLAlchemy.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Ensure the database directory exists
if settings.DATABASE_URL.startswith("sqlite"):
    db_file_path = settings.DATABASE_URL.replace("sqlite:///", "")
    db_directory = os.path.dirname(db_file_path)
    if db_directory:
        os.makedirs(db_directory, exist_ok=True)

# SQLite engine configuration
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a scoped SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all configured database tables in SQLite and ensure schema sync."""
    import backend.app.models  # noqa: F401 - ensure models register with Base.metadata

    Base.metadata.create_all(bind=engine)

    # For SQLite prototype: dynamically add any new columns if tables already existed
    if settings.DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            # Check emergency_vehicles
            result = conn.exec_driver_sql("PRAGMA table_info(emergency_vehicles)")
            existing_cols = {row[1] for row in result.fetchall()}
            new_vehicle_cols = [
                ("current_latitude", "FLOAT"),
                ("current_longitude", "FLOAT"),
                ("speed", "FLOAT DEFAULT 0.0"),
                ("last_location_time", "TIMESTAMP"),
                ("emergency_status", "VARCHAR DEFAULT 'IDLE'"),
            ]
            for col_name, col_type in new_vehicle_cols:
                if col_name not in existing_cols:
                    conn.exec_driver_sql(
                        f"ALTER TABLE emergency_vehicles ADD COLUMN {col_name} {col_type}"
                    )

            # Check emergencies
            emg_res = conn.exec_driver_sql("PRAGMA table_info(emergencies)")
            emg_cols = {row[1] for row in emg_res.fetchall()}
            new_emg_cols = [
                ("current_route", "TEXT"),
                ("destination_junction_id", "VARCHAR"),
                ("current_corridor_junction_id", "VARCHAR"),
            ]
            for col_name, col_type in new_emg_cols:
                if col_name not in emg_cols:
                    conn.exec_driver_sql(
                        f"ALTER TABLE emergencies ADD COLUMN {col_name} {col_type}"
                    )

            conn.commit()
