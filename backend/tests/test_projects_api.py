import pytest
from backend.app.models import Project

# Fixtures like test_client, auth_headers, created_project_data, db_session,
# and another_user_auth_headers_activity are assumed to be available from conftest.py

def test_update_project_success_only_name(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    new_name = "Updated Project Name Only"
    headers = {"Authorization": auth_headers["Authorization"]}

    # Fetch original description for assertion
    get_response = test_client.get(f"/api/projects/{project_id}", headers=headers)
    original_description = get_response.json["description"]

    response = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"name": new_name}
    )
    assert response.status_code == 200
    updated_project = response.json
    assert updated_project["name"] == new_name
    assert updated_project["description"] == original_description # Description should not change

    # Verify in DB
    project_db = db_session.query(Project).get(project_id)
    assert project_db.name == new_name
    assert project_db.description == original_description

def test_update_project_success_only_description(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    original_name = created_project_data["name"]
    new_description = "Updated Project Description Only"
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"description": new_description}
    )
    assert response.status_code == 200
    updated_project = response.json
    assert updated_project["name"] == original_name # Name should not change
    assert updated_project["description"] == new_description

    # Verify in DB
    project_db = db_session.query(Project).get(project_id)
    assert project_db.name == original_name
    assert project_db.description == new_description

def test_update_project_empty_name_and_description(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}

    # Fetch current project state
    get_response = test_client.get(f"/api/projects/{project_id}", headers=headers)
    original_name = get_response.json["name"] # Get current name
    # original_description = get_response.json["description"] # Get current description

    # Attempt to update with empty name string - should not change the name
    response_empty_name = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"name": "   "} # Empty after strip
    )
    assert response_empty_name.status_code == 200
    assert response_empty_name.json["name"] == original_name # Name should not change

    # Verify in DB that name hasn't changed
    project_db_after_empty_name = db_session.query(Project).get(project_id)
    assert project_db_after_empty_name.name == original_name

    # Attempt to update with empty description string - should change description to empty
    response_empty_desc = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"description": "   "} # Empty after strip
    )
    assert response_empty_desc.status_code == 200
    assert response_empty_desc.json["description"] == "" # Description should be empty
    assert response_empty_desc.json["name"] == original_name # Name should remain original

    # Verify in DB
    project_db_after_empty_desc = db_session.query(Project).get(project_id)
    assert project_db_after_empty_desc.description == ""
    assert project_db_after_empty_desc.name == original_name


def test_update_project_no_input_data(test_client, auth_headers, created_project_data):
    project_id = created_project_data["id"]
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={} # No data
    )
    assert response.status_code == 400
    assert response.json["message"] == "No input data provided"

def test_update_project_forbidden(test_client, created_project_data, another_user_auth_headers_activity):
    project_id = created_project_data["id"] # Created by the primary fixture user
    other_user_headers = another_user_auth_headers_activity # Headers for a different user

    response = test_client.put(
        f"/api/projects/{project_id}",
        headers=other_user_headers,
        json={"name": "Attempt by Other User"}
    )
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden"

def test_update_non_existent_project(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.put(
        "/api/projects/99999", # Non-existent ID
        headers=headers,
        json={"name": "Trying to update ghost project"}
    )
    assert response.status_code == 404
    assert response.json["message"] == "Project not found"

def test_update_project_success_name_and_description(test_client, auth_headers, created_project_data, db_session):
    project_id = created_project_data["id"]
    new_name = "Fully Updated Name"
    new_description = "Fully Updated Description"
    headers = {"Authorization": auth_headers["Authorization"]}

    response = test_client.put(
        f"/api/projects/{project_id}",
        headers=headers,
        json={"name": new_name, "description": new_description}
    )
    assert response.status_code == 200
    updated_project = response.json
    assert updated_project["name"] == new_name
    assert updated_project["description"] == new_description

    # Verify in DB
    project_db = db_session.query(Project).get(project_id)
    assert project_db.name == new_name
    assert project_db.description == new_description

def test_update_project_unauthorized(test_client, created_project_data):
    project_id = created_project_data["id"]
    # No Authorization header
    response = test_client.put(
        f"/api/projects/{project_id}",
        json={"name": "Attempt without Auth"}
    )
    assert response.status_code == 401
    # The specific message can vary, "Missing Authorization Header" is common for Flask-JWT-Extended
    assert "Missing Authorization Header" in response.json.get("msg", "") or \
           "Authorization Required" in response.json.get("message", "") # Adjust if message is different

def test_create_project_missing_name(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    
    # Test with no name field
    response_no_name = test_client.post("/api/projects", headers=headers, json={"description": "Project without name"})
    assert response_no_name.status_code == 400
    assert response_no_name.json["message"] == "Project name is required"

    # Test with empty name string
    response_empty_name = test_client.post("/api/projects", headers=headers, json={"name": "   ", "description": "Project with empty name"})
    assert response_empty_name.status_code == 400
    assert response_empty_name.json["message"] == "Project name is required"

    # Test with no data
    response_no_data = test_client.post("/api/projects", headers=headers, json={})
    assert response_no_data.status_code == 400
    assert response_no_data.json["message"] == "Project name is required"

def test_get_project_forbidden(test_client, created_project_data, another_user_auth_headers_activity):
    project_id = created_project_data["id"] # Created by primary user
    other_user_headers = another_user_auth_headers_activity

    response = test_client.get(f"/api/projects/{project_id}", headers=other_user_headers)
    assert response.status_code == 403
    assert response.json["message"] == "Access forbidden" # Matches the message in get_project

def test_get_non_existent_project(test_client, auth_headers):
    headers = {"Authorization": auth_headers["Authorization"]}
    response = test_client.get("/api/projects/99999", headers=headers) # Non-existent ID
    assert response.status_code == 404
    assert response.json["message"] == "Project not found"

# Test to ensure successful project creation is still fine (sanity check, good for coverage of success path)
def test_create_project_success_with_description(test_client, auth_headers, db_session):
    headers = {"Authorization": auth_headers["Authorization"]}
    project_name = "Test Project with Desc"
    project_desc = "A detailed description for this test project."
    
    response = test_client.post(
        "/api/projects",
        headers=headers,
        json={"name": project_name, "description": project_desc}
    )
    assert response.status_code == 201
    created_project = response.json
    assert created_project["name"] == project_name
    assert created_project["description"] == project_desc
    assert "id" in created_project

    # Verify in DB
    project_db = db_session.query(Project).get(created_project["id"])
    assert project_db is not None
    assert project_db.name == project_name
    assert project_db.description == project_desc
    assert project_db.user_id == auth_headers["user_id"]

    # Clean up: delete the created project to avoid interference if tests are not perfectly isolated by db_session commits/rollbacks
    # This is generally good practice if not relying on full DB teardown/setup per test,
    # but db_session fixture should handle rollback. However, explicit cleanup is safer.
    # db_session.delete(project_db)
    # db_session.commit()
    # For now, rely on db_session fixture's rollback.
