import pytest
from sqlalchemy.orm import scoped_session, sessionmaker

from backend.app import (
    create_app,
    db as _db,
)  # Alias db to avoid pytest collection error


@pytest.fixture(
    scope="session"
)  # Changed to session scope for potentially better performance
def test_app():
    # Ensure FLASK_CONFIG is set to testing for the app creation
    # This is also handled by pytest.ini, but explicit here is fine too.
    app = create_app(config_name="testing")

    # Establish an application context before running the tests.
    with app.app_context():
        _db.create_all()  # Create tables for test DB
        yield app  # This is where the testing happens
        _db.session.remove()
        _db.drop_all()  # Clean up after tests


@pytest.fixture(scope="session")  # Changed to session scope
def test_client(test_app):
    """A test client for the app."""
    return test_app.test_client()


@pytest.fixture(scope="session")  # Changed to session scope
def db(test_app):
    """Session-wide test database."""
    # This fixture provides the db instance correctly scoped
    # It depends on test_app to ensure app_context and db setup/teardown
    return _db


# Optional fixture if you need to pre-populate or perform actions per test
@pytest.fixture(
    scope="function"
)  # Use function scope if data needs to be reset per test
def init_database(db_session):  # Renamed from test_app to db_session to avoid confusion
    # Example: Add any initial data if needed for specific tests
    # from backend.app.models import User
    # user = User(username='testuser', email='test@example.com')
    # user.set_password('password')
    # db_session.add(user)
    # db_session.commit()
    yield db_session  # or yield nothing if it's just setup

    # Clean up data added in this fixture if necessary,
    # though db.drop_all() in test_app fixture handles full cleanup.
    # For function scope, you might want to clear specific tables or rollback transactions.
    # For now, relying on full drop_all.


@pytest.fixture(scope="function")
def db_session(db):
    """
    Yields a SQLAlchemy session for use in tests.
    Manages transactions and session lifecycle to ensure test isolation
    and compatibility with the application's session handling.
    """
    # Store the original session that the app uses, to restore it later
    original_session = db.session

    # Create a new connection and begin a transaction for this test
    connection = db.engine.connect()
    transaction = connection.begin()

    # Create a new session factory, bound to this specific connection
    test_session_factory = sessionmaker(bind=connection)
    # Create a new scoped session object for this test
    test_specific_session = scoped_session(test_session_factory)

    # Monkeypatch db.session so the app uses our test_specific_session during the test
    db.session = test_specific_session

    yield test_specific_session  # The test runs, using this session

    # Teardown:
    # 1. Remove the test-specific session. This calls remove() on the scoped_session,
    #    which typically closes the underlying session and returns the connection to the pool if applicable.
    #    It's important this happens for the session the app was using.
    db.session.remove() # or test_specific_session.remove() - they are the same object at this point

    # 2. Rollback the transaction to ensure test isolation
    transaction.rollback()

    # 3. Close the connection that was specifically created for this test
    connection.close()
    
    # 4. Restore the original session to db.session for subsequent operations outside this test's scope
    #    (e.g., if other fixtures or higher-scoped setups need the original app session).
    db.session = original_session


# --- Shared Fixtures for API Tests ---


@pytest.fixture(scope="function")
def registered_user(test_client, db_session):
    """
    Registers a new user and returns their details.
    This fixture ensures a user is in the DB for tests that might need user_id directly
    or for creating resources associated with a user.
    """
    user_details = {
        "username": "testfixtureuser",
        "email": "fixture@example.com",
        "password": "password123",
    }
    # Attempt registration, handle if already exists from a previous failed/unclean test run if session scope was wider
    # For function scope db_session, this should be clean each time.
    response = test_client.post("/api/auth/register", json=user_details)

    # If user already exists (e.g. from a test that didn't clean up properly, or if scope isn't function)
    # try to fetch the user instead. For true function-scoped DB isolation, this check is less critical.
    is_conflict = response.status_code == 409
    message = response.json.get("message", "")
    email_exists = "Email already exists" in message
    username_exists = "Username already exists" in message

    if is_conflict and (email_exists or username_exists):
        from backend.app.models import User

        user = User.query.filter_by(email=user_details["email"]).first()
        if not user:  # Should not happen if 409 was due to this user
            pytest.fail(
                f"User registration conflict for {user_details['email']}, "
                "but user not found."
            )
    elif response.status_code != 201:
        pytest.fail(
            f"User registration failed with status {response.status_code}: "
            f"{response.json}"
        )

    from backend.app.models import User  # Import here to ensure app context

    user = User.query.filter_by(email=user_details["email"]).first()
    assert user is not None, "User should have been created or found"

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        # Return plain password for login
        "password": user_details["password"],
    }


@pytest.fixture(scope="function")
def auth_headers(test_client, registered_user):
    """Logs in the registered_user and returns authorization headers."""
    login_response = test_client.post(
        "/api/auth/login",
        json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        },
    )
    if login_response.status_code != 200:
        pytest.fail(
            f"Login failed for user {registered_user['email']}: "
            f"{login_response.json}"
        )

    access_token = login_response.json["access_token"]
    return {
        "Authorization": f"Bearer {access_token}",
        "user_id": registered_user["id"],  # Include user_id for convenience
        # Include username for convenience
        "username": registered_user["username"],
    }


@pytest.fixture(scope="function")
def created_project_data(test_client, auth_headers, db_session):
    """Creates a project for the authenticated user and returns its data."""
    project_name = "Shared Test Project"
    response = test_client.post(
        "/api/projects",
        headers={"Authorization": auth_headers["Authorization"]},
        json={
            "name": project_name,
            "description": "A project created by shared fixture",
        },
    )
    if response.status_code != 201:
        pytest.fail(f"Project creation failed: {response.json}")

    project_data = response.json
    return {
        "id": project_data["id"],
        "name": project_data["name"],
        "user_id": auth_headers["user_id"],  # From auth_headers fixture
    }


@pytest.fixture(scope="function")
def created_task_data(test_client, auth_headers, created_project_data, db_session):
    """
    Creates a project, stage, and task for the authenticated user.
    Returns a dictionary with ids: {'project_id', 'stage_id', 'task_id',
    'user_id', 'username'} and other relevant info like names.
    """
    headers = {"Authorization": auth_headers["Authorization"]}
    project_id = created_project_data["id"]

    # Create Stage
    stage_name = "Shared Test Stage"
    stage_response = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=headers,
        json={"name": stage_name},
    )
    if stage_response.status_code != 201:
        pytest.fail(f"Stage creation failed: {stage_response.json}")
    stage_id = stage_response.json["id"]

    # Create Task
    task_content = "Shared Test Task Content"
    task_response = test_client.post(
        f"/api/stages/{stage_id}/tasks", headers=headers, json={"content": task_content}
    )
    if task_response.status_code != 201:
        pytest.fail(f"Task creation failed: {task_response.json}")
    task_id = task_response.json["id"]

    return {
        "task_id": task_id,
        "stage_id": stage_id,
        "project_id": project_id,
        "user_id": auth_headers["user_id"],
        "username": auth_headers["username"],
        "project_name": created_project_data["name"],
        "stage_name": stage_name,
        "task_content": task_content,
    }
