from app.db.database import DatabaseEngineSingleton, SessionLocal, engine


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
