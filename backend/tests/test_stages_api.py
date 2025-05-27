import pytest
from backend.app.models import Stage

# Fixtures: test_client, auth_headers, created_project_data, db_session,
# another_user_auth_headers_activity (assuming it will be moved to conftest)


# Helper to create a stage for tests that need an existing one
@pytest.fixture(scope="function")
def created_stage_data(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}
    stage_name = "Test Stage for Stages API"

    response = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=headers,
        json={"name": stage_name, "order": 1}
    )
    if response.status_code != 201:
        pytest.fail(f"Failed to create stage for setup: {response.json}")
    stage_data = response.json
    return {
        "id": stage_data["id"],
        "name": stage_data["name"],
        "project_id": project_id,
        "order": stage_data["order"]
    }


# === Tests for POST /api/projects/<project_id>/stages ===
def test_create_stage_success(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}
    stage_name = "New Unique Stage"
    stage_order = 10

    response = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=headers,
        json={"name": stage_name, "order": stage_order}
    )
    assert response.status_code == 201
    created_stage = response.json
    assert created_stage["name"] == stage_name
    assert created_stage["order"] == stage_order
    assert created_stage["project_id"] == project_id

    stage_db = db_session.query(Stage).get(created_stage["id"])
    assert stage_db is not None
    assert stage_db.name == stage_name


def test_create_stage_project_not_found(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.post(
        "/api/projects/9999/stages",
        headers=headers,
        json={"name": "Stage for Ghost Project"}
    )
    assert response.status_code == 404
    assert response.json["message"] == "Project not found"


def test_create_stage_forbidden_for_project(test_client, created_project_data, another_user_auth_headers_activity):
    project_id = created_project_data["id"]  # Belongs to primary user
    other_user_headers = another_user_auth_headers_activity

    response = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=other_user_headers,
        json={"name": "Stage by Other User"}
    )
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden to this project"


def test_create_stage_missing_name(test_client, auth_headers, created_project_data):
    project_id = created_project_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=headers,
        json={}  # No name
    )
    assert response.status_code == 400
    assert response.json["message"] == "Stage name is required"

    response_empty_name = test_client.post(
        f"/api/projects/{project_id}/stages",
        headers=headers,
        json={"name": "   "}  # Empty name
    )
    assert response_empty_name.status_code == 400
    assert response_empty_name.json["message"] == "Stage name is required"


# === Tests for GET /api/projects/<project_id>/stages ===
def test_get_stages_for_project_success(test_client, auth_headers, created_stage_data):  # Uses created_stage_data
    project_id = created_stage_data["project_id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.get(f"/api/projects/{project_id}/stages", headers=headers)
    assert response.status_code == 200
    stages = response.json
    assert isinstance(stages, list)
    assert len(stages) >= 1  # At least the one created in created_stage_data
    assert any(s["id"] == created_stage_data["id"] for s in stages)


def test_get_stages_project_not_found(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.get("/api/projects/9999/stages", headers=headers)
    assert response.status_code == 404
    assert response.json["message"] == "Project not found"


def test_get_stages_forbidden_for_project(test_client, created_project_data, another_user_auth_headers_activity):
    project_id = created_project_data["id"]
    other_user_headers = another_user_auth_headers_activity
    response = test_client.get(f"/api/projects/{project_id}/stages", headers=other_user_headers)
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden to this project"


# === Tests for PUT /api/stages/<stage_id> ===
def test_update_stage_success(test_client, auth_headers, created_stage_data, db_session):
    stage_id = created_stage_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}
    new_name = "Updated Stage Name"
    new_order = 5

    response = test_client.put(
        f"/api/stages/{stage_id}",
        headers=headers,
        json={"name": new_name, "order": new_order}
    )
    assert response.status_code == 200
    updated_stage = response.json
    assert updated_stage["name"] == new_name
    assert updated_stage["order"] == new_order

    stage_db = db_session.query(Stage).get(stage_id)
    assert stage_db.name == new_name
    assert stage_db.order == new_order


def test_update_stage_not_found(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.put("/api/stages/9999", headers=headers, json={"name": "Ghost Stage"})
    assert response.status_code == 404
    assert response.json["message"] == "Stage not found"


def test_update_stage_forbidden(test_client, created_stage_data, another_user_auth_headers_activity):
    stage_id = created_stage_data["id"]
    other_user_headers = another_user_auth_headers_activity
    response = test_client.put(
        f"/api/stages/{stage_id}",
        headers=other_user_headers,
        json={"name": "Update by Other"}
    )
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden to this stage"


def test_update_stage_no_input_data(test_client, auth_headers, created_stage_data):
    stage_id = created_stage_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.put(f"/api/stages/{stage_id}", headers=headers, json={})
    assert response.status_code == 400
    assert response.json["message"] == "No input data provided"


def test_update_stage_empty_name(test_client, auth_headers, created_stage_data, db_session):
    stage_id = created_stage_data["id"]
    original_stage = db_session.query(Stage).get(stage_id)
    original_name = original_stage.name
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.put(f"/api/stages/{stage_id}", headers=headers, json={"name": "   "})
    assert response.status_code == 200  # Should not update if name is only whitespace
    assert response.json["name"] == original_name


# === Tests for DELETE /api/stages/<stage_id> ===
def test_delete_stage_success(test_client, auth_headers, created_stage_data, db_session):
    stage_id = created_stage_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.delete(f"/api/stages/{stage_id}", headers=headers)
    assert response.status_code == 204

    stage_db = db_session.query(Stage).get(stage_id)
    assert stage_db is None


def test_delete_stage_not_found(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.delete("/api/stages/9999", headers=headers)
    assert response.status_code == 404
    assert response.json["message"] == "Stage not found"


def test_delete_stage_forbidden(test_client, created_stage_data, another_user_auth_headers_activity):
    stage_id = created_stage_data["id"]
    other_user_headers = another_user_auth_headers_activity
    response = test_client.delete(f"/api/stages/{stage_id}", headers=other_user_headers)
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden to this stage"
