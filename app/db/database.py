from threading import Lock

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL


class DatabaseEngineSingleton:
    """Create one shared database engine and session factory per process."""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        with self._lock:
            if getattr(self, "_initialized", False):
                return
            connect_args = (
                {"check_same_thread": False}
                if DATABASE_URL.startswith("sqlite")
                else {}
            )
            # pool_pre_ping handles database connections closed after idle periods.
            self.engine = create_engine(
                DATABASE_URL, connect_args=connect_args, pool_pre_ping=True
            )
            self.session_factory = sessionmaker(
                bind=self.engine, autoflush=False, autocommit=False
            )
            self._initialized = True


database = DatabaseEngineSingleton()
engine = database.engine
SessionLocal = database.session_factory


class Base(DeclarativeBase):
    pass


def upgrade_legacy_schema(db_engine=engine) -> None:
    """Add newly required columns to databases created before schema upgrades existed."""
    inspector = inspect(db_engine)
    if "traps" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("traps")}
    if "status" not in columns:
        with db_engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE traps ADD COLUMN status "
                    "VARCHAR(30) NOT NULL DEFAULT 'active'"
                )
            )


def get_db():
    """FastAPI dependency: one database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()