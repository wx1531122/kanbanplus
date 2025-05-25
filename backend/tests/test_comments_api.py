import pytest
from backend.app.models import Comment

# Fixtures `auth_headers` and `created_task_data` are now in conftest.py

# --- Test Cases for Comments API ---


def test_create_comment_success(
    test_client, auth_headers, created_task_data, db_session
):
    task_id = created_task_data["task_id"]
    request_headers = {"Authorization": auth_headers["Authorization"]}
    comment_content = "This is a test comment."

    response = test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers,
        json={"content": comment_content},
    )
    assert response.status_code == 201
    data = response.json
    assert data["content"] == comment_content
    assert data["task_id"] == task_id
    assert data["user_id"] == auth_headers["user_id"]
    assert data["commenter_username"] == auth_headers["username"]

    # Verify in DB
    comment_db = db_session.query(Comment).filter_by(id=data["id"]).first()
    assert comment_db is not None
    assert comment_db.content == comment_content
    assert comment_db.task_id == task_id
    assert comment_db.user_id == auth_headers["user_id"]


def test_get_comments_for_task(
    test_client, auth_headers, created_task_data, db_session
):
    task_id = created_task_data["task_id"]
    request_headers = {"Authorization": auth_headers["Authorization"]}

    # Create a couple of comments
    test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers,
        json={"content": "First comment"},
    )
    test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers,
        json={"content": "Second comment"},
    )

    response = test_client.get(
        f"/api/tasks/{task_id}/comments", headers=request_headers
    )
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["content"] == "First comment"  # Ordered by created_at asc
    assert data[0]["commenter_username"] == auth_headers["username"]
    assert data[1]["content"] == "Second comment"
    assert data[1]["commenter_username"] == auth_headers["username"]


def test_create_comment_non_existent_task(test_client, auth_headers):
    request_headers = {"Authorization": auth_headers["Authorization"]}
    non_existent_task_id = 99999
    response = test_client.post(
        f"/api/tasks/{non_existent_task_id}/comments",
        headers=request_headers,
        json={"content": "A comment for a ghost task."},
    )
    assert response.status_code == 404
    assert response.json["message"] == "Task not found"


def test_create_comment_missing_content(test_client, auth_headers, created_task_data):
    task_id = created_task_data["task_id"]
    request_headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.post(
        f"/api/tasks/{task_id}/comments", headers=request_headers, json={}
    )
    assert response.status_code == 400
    assert response.json["message"] == "Comment content is required"

    response = test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers,
        json={"content": "   "},
    )  # Whitespace only
    assert response.status_code == 400
    assert response.json["message"] == "Comment content is required"


def test_comment_unauthorized_no_token(test_client, created_task_data):
    task_id = created_task_data["task_id"]
    # Try POST without token
    response_post = test_client.post(
        f"/api/tasks/{task_id}/comments", json={"content": "Unauthorized comment"}
    )
    assert response_post.status_code == 401

    # Try GET without token
    response_get = test_client.get(f"/api/tasks/{task_id}/comments")
    assert response_get.status_code == 401


@pytest.fixture(scope="function")
def another_user_auth_headers(test_client, db_session):  # Added db_session
    """Registers and logs in a different user."""
    email = "another_user_comment@example.com"
    password = "password456"
    username = "another_comment_user"

    # Use a unique email/username to avoid conflicts if tests run in parallel or DB is not perfectly clean
    # This is good practice even with function-scoped db_session.
    register_response = test_client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    # Allow for user already existing if db isn't perfectly clean between test runs, though ideally it is.
    assert register_response.status_code in [201, 409]

    login_response = test_client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert (
        login_response.status_code == 200
    ), (
        f"Login failed for another_user: "
        f"{login_response.json}"
    )
    access_token = login_response.json["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def test_comment_on_others_task_forbidden(
    test_client, created_task_data, another_user_auth_headers
):
    task_id = created_task_data[
        "task_id"
    ]  # Task created by the first user (auth_headers fixture user)
    request_headers_another_user = another_user_auth_headers

    # Another user tries to comment
    response_post = test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers_another_user,
        json={"content": "Trying to comment on someone else's task"},
    )
    assert response_post.status_code == 403
    assert response_post.json["message"] == "Access forbidden to this task"

    # Another user tries to get comments
    response_get = test_client.get(
        f"/api/tasks/{task_id}/comments", headers=request_headers_another_user
    )
    assert response_get.status_code == 403
    assert response_get.json["message"] == "Access forbidden to this task"


def test_get_comments_for_non_existent_task(test_client, auth_headers):
    request_headers = {"Authorization": auth_headers["Authorization"]}
    non_existent_task_id = 88888
    response = test_client.get(
        f"/api/tasks/{non_existent_task_id}/comments", headers=request_headers
    )
    assert response.status_code == 404
    assert response.json["message"] == "Task not found"


def test_get_comments_empty(test_client, auth_headers, created_task_data):
    task_id = created_task_data["task_id"]
    request_headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.get(
        f"/api/tasks/{task_id}/comments", headers=request_headers
    )
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) == 0


# Test that activity log is created for new comment
def test_create_comment_activity_log(
    test_client, auth_headers, created_task_data, db_session
):
    task_id = created_task_data["task_id"]
    project_id = created_task_data["project_id"]
    task_content_ellipsis = (
        created_task_data["task_content"][:30] + "..."
    )  # Match how it's logged
    request_headers = {"Authorization": auth_headers["Authorization"]}
    comment_content = "This is a test comment for activity log."

    response = test_client.post(
        f"/api/tasks/{task_id}/comments",
        headers=request_headers,
        json={"content": comment_content},
    )
    assert response.status_code == 201

    # Check activity log for the project
    activity_response = test_client.get(
        f"/api/projects/{project_id}/activities", headers=request_headers
    )
    assert activity_response.status_code == 200
    activities = activity_response.json

    # Activities are ordered desc by created_at. The comment activity should be the most recent related to this task/project.
    # Assuming project creation, stage creation, task creation also log activities.
    # The exact position might vary if other default activities are logged by fixtures.

    comment_activity_found = False
    for activity in activities:
        if (
            activity["action_type"] == "COMMENT_ADDED"
            and activity["task_id"] == task_id
            and activity["project_id"] == project_id
            and activity["user_id"] == auth_headers["user_id"]
        ):
            desc_str = f"commented on task '{task_content_ellipsis}'"
            assert desc_str in activity["description"]
            comment_activity_found = True
            break
    assert comment_activity_found, (
        "COMMENT_ADDED activity not found for new comment in project "
        "activities"
    )

    # Check activity log for the task
    task_activity_response = test_client.get(
        f"/api/tasks/{task_id}/activities", headers=request_headers
    )
    assert task_activity_response.status_code == 200
    task_activities = task_activity_response.json

    task_comment_activity_found = False
    for activity in task_activities:
        if (
            activity["action_type"] == "COMMENT_ADDED"
            and activity["user_id"] == auth_headers["user_id"]
        ):
            desc_str = f"commented on task '{task_content_ellipsis}'"
            assert desc_str in activity["description"]
            task_comment_activity_found = True
            break
    assert task_comment_activity_found, (
        "COMMENT_ADDED activity not found for new comment on task "
        "activities"
    )
