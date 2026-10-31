from sqlalchemy import create_engine, inspect, text

from app.db.database import (
    DatabaseEngineSingleton,
    SessionLocal,
    engine,
    upgrade_legacy_schema,
)


def test_database_engine_singleton_shares_engine_and_factory():
    first = DatabaseEngineSingleton()
    second = DatabaseEngineSingleton()

    assert first is second
    assert first.engine is second.engine is engine
    assert first.session_factory is second.session_factory is SessionLocal

    first_session = first.session_factory()
    second_session = second.session_factory()
    try:
        assert first_session is not second_session
    finally:
        first_session.close()
        second_session.close()


def test_legacy_schema_upgrade_adds_active_trap_status():
    legacy_engine = create_engine("sqlite://")
    try:
        with legacy_engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE traps (id INTEGER PRIMARY KEY, code VARCHAR(30))")
            )
            connection.execute(
                text("INSERT INTO traps (id, code) VALUES (1, 'OLD-01')")
            )

        upgrade_legacy_schema(legacy_engine)

        columns = {column["name"] for column in inspect(legacy_engine).get_columns("traps")}
        with legacy_engine.connect() as connection:
            status = connection.scalar(text("SELECT status FROM traps WHERE id = 1"))
        assert "status" in columns
        assert status == "active"
    finally:
        legacy_engine.dispose()
