from backend.app.models import User


# Helper function to register a user
def register_user(client, username, email, password):
    return client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )


# Helper function to log in a user
def login_user(client, email, password):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_successful_registration(
    test_client, db_session
):  # db_session for potential direct DB checks
    response = register_user(
        test_client, "testuser1", "test1@example.com", "password123"
    )
    assert response.status_code == 201
    assert response.json["message"] == "User registered successfully"

    # Verify user in database (optional, but good for confirmation)
    user = User.query.filter_by(email="test1@example.com").first()
    assert user is not None
    assert user.username == "testuser1"


def test_registration_missing_fields(test_client):
    response = register_user(
        test_client, "testuser2", "", "password123"
    )  # Missing email
    assert response.status_code == 400
    assert "Missing username, email, or password" in response.json["message"]

    response = register_user(
        test_client, "", "test2@example.com", "password123"
    )  # Missing username
    assert response.status_code == 400
    assert "Missing username, email, or password" in response.json["message"]

    response = register_user(
        test_client, "testuser2b", "test2b@example.com", None
    )  # Missing password
    assert response.status_code == 400
    assert "Missing username, email, or password" in response.json["message"]


def test_registration_duplicate_username(test_client, db_session):
    register_user(
        test_client, "testuser3", "test3@example.com", "password123"
    )  # First registration
    response = register_user(
        test_client, "testuser3", "test3_other@example.com", "password123"
    )  # Duplicate username
    assert response.status_code == 409
    assert response.json["message"] == "Username already exists"


def test_registration_duplicate_email(test_client, db_session):
    register_user(
        test_client, "testuser4", "test4@example.com", "password123"
    )  # First registration
    response = register_user(
        test_client, "testuser4_other", "test4@example.com", "password123"
    )  # Duplicate email
    assert response.status_code == 409
    assert response.json["message"] == "Email already exists"


def test_successful_login(test_client, db_session):
    # First, register a user
    email = "loginuser@example.com"
    password = "loginpassword"
    register_user(test_client, "loginuser", email, password)

    # Attempt login
    response = login_user(test_client, email, password)
    assert response.status_code == 200
    assert "access_token" in response.json


def test_login_nonexistent_user(test_client):
    response = login_user(test_client, "nonexistent@example.com", "password")
    assert response.status_code == 401
    assert response.json["message"] == "Invalid email or password"


def test_login_incorrect_password(test_client, db_session):
    email = "wrongpass@example.com"
    password = "correctpassword"
    register_user(test_client, "wrongpassuser", email, password)

    response = login_user(test_client, email, "incorrectpassword")
    assert response.status_code == 401
    assert response.json["message"] == "Invalid email or password"


def test_login_missing_fields(test_client):
    response = login_user(
        test_client, "someuser@example.com", "")  # Missing password
    assert response.status_code == 400
    assert response.json["message"] == "Missing email or password"

    response = login_user(test_client, "", "somepassword")  # Missing email
    assert response.status_code == 400
    assert response.json["message"] == "Missing email or password"


def test_protected_route_no_token(test_client):
    response = test_client.get("/api/protected")
    assert response.status_code == 401  # Expecting JWT error (missing token)
    assert "msg" in response.json  # Flask-JWT-Extended default error key


def test_protected_route_with_valid_token(test_client, db_session):
    # Register and login to get a token
    email = "protected_user@example.com"
    password = "password"
    register_user(test_client, "protected_user", email, password)
    login_response = login_user(test_client, email, password)
    access_token = login_response.json["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    response = test_client.get("/api/protected", headers=headers)
    assert response.status_code == 200
    assert "logged_in_as" in response.json
    assert response.json["logged_in_as"]["email"] == email


def test_protected_route_with_invalid_token(test_client):
    headers = {"Authorization": "Bearer invalidtoken123"}
    response = test_client.get("/api/protected", headers=headers)
    assert (
        response.status_code == 422
    )  # Expecting JWT error (invalid token format or content)
    assert "msg" in response.json  # Flask-JWT-Extended default error key
    assert (
        response.json["msg"]
        in ["Invalid header padding", "Not enough segments", "Invalid token format"]
        or "Invalid" in response.json["msg"]
    )
    # The exact message can vary based on the nature of the invalid token.
    # For a simple non-JWT string, it's often "Invalid header padding" or "Not enough segments".
    # If it's a malformed JWT, it could be other messages.


# Simple logout test (V1 just returns success, client discards token)
def test_logout(test_client, db_session):
    # Register and login to get a token
    email = "logout_user@example.com"
    password = "password"
    register_user(test_client, "logout_user", email, password)
    login_response = login_user(test_client, email, password)
    access_token = login_response.json["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    response = test_client.post(
        "/api/auth/logout", headers=headers)  # POST for logout
    assert response.status_code == 200
    assert (
        response.json["message"]
        == "Logout successful. Please discard the token client-side."
    )
    # Further test: Try to access protected route with the "logged out" token.
    # Since V1 is stateless, the token is still valid until it expires.
    # This behavior is expected for stateless JWT.
    protected_response = test_client.get("/api/protected", headers=headers)
    assert protected_response.status_code == 200
    assert protected_response.json["logged_in_as"]["email"] == email
