import pytest
from backend.app import create_app, db as _db # Alias db to avoid pytest collection error

@pytest.fixture(scope='session') # Changed to session scope for potentially better performance
def test_app():
    # Ensure FLASK_CONFIG is set to testing for the app creation
    # This is also handled by pytest.ini, but explicit here is fine too.
    app = create_app(config_name='testing')
    
    # Establish an application context before running the tests.
    with app.app_context():
        _db.create_all() # Create tables for test DB
        yield app # This is where the testing happens
        _db.session.remove()
        _db.drop_all() # Clean up after tests

@pytest.fixture(scope='session') # Changed to session scope
def test_client(test_app):
    """A test client for the app."""
    return test_app.test_client()

@pytest.fixture(scope='session') # Changed to session scope
def db(test_app):
    """Session-wide test database."""
    # This fixture provides the db instance correctly scoped
    # It depends on test_app to ensure app_context and db setup/teardown
    return _db

# Optional fixture if you need to pre-populate or perform actions per test
@pytest.fixture(scope='function') # Use function scope if data needs to be reset per test
def init_database(db_session): # Renamed from test_app to db_session to avoid confusion
    # Example: Add any initial data if needed for specific tests
    # from backend.app.models import User
    # user = User(username='testuser', email='test@example.com')
    # user.set_password('password')
    # db_session.add(user)
    # db_session.commit()
    yield db_session # or yield nothing if it's just setup
    
    # Clean up data added in this fixture if necessary,
    # though db.drop_all() in test_app fixture handles full cleanup.
    # For function scope, you might want to clear specific tables or rollback transactions.
    # For now, relying on full drop_all.

@pytest.fixture(scope='function')
def db_session(db):
    """
    Yields a SQLAlchemy session for use in tests.
    Rolls back transactions after each test to ensure test isolation.
    """
    connection = db.engine.connect()
    transaction = connection.begin()
    options = dict(bind=connection, binds={})
    session = db.create_scoped_session(options=options)
    db.session = session # Monkeypatch the main db.session to this test session

    yield session

    transaction.rollback()
    connection.close()
    session.remove()
