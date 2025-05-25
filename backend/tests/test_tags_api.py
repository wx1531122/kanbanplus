from backend.app.models import Tag, Task

# Fixtures `auth_headers` and `created_task_data` are now in conftest.py
# Assuming auth_headers_tags and created_task_for_tags are specific fixtures for this module,
# or defined in conftest.py. If not, they would cause F821, but not F401 for these models.

# --- Test Cases for Tags API ---


# POST /api/tags & GET /api/tags
def test_create_and_list_tags(test_client, auth_headers, db_session):
    request_headers = {"Authorization": auth_headers["Authorization"]}
    tag_name1 = "Urgent"
    tag_name2 = "Backend"

    # Create first tag
    response_create1 = test_client.post(
        "/api/tags", headers=request_headers, json={"name": tag_name1}
    )
    assert response_create1.status_code == 201
    assert response_create1.json["name"] == tag_name1
    tag1_id = response_create1.json["id"]

    # Attempt to create same tag (case-insensitive check should find it, then exact match)
    response_create_dup = test_client.post(
        "/api/tags", headers=request_headers, json={"name": tag_name1.lower()}
    )
    assert response_create_dup.status_code == 200  # Returns existing tag
    assert response_create_dup.json["id"] == tag1_id
    # Name should be original case
    assert response_create_dup.json["name"] == tag_name1

    # Create second tag
    response_create2 = test_client.post(
        "/api/tags", headers=request_headers, json={"name": tag_name2}
    )
    assert response_create2.status_code == 201
    assert response_create2.json["name"] == tag_name2

    # List all tags
    response_list = test_client.get("/api/tags", headers=request_headers)
    assert response_list.status_code == 200
    tags = response_list.json
    assert isinstance(tags, list)
    assert (
        len(tags) >= 2
    )  # Could be more if other tests created tags and DB is not perfectly isolated by function

    found_tag1 = any(t["name"] == tag_name1 and t["id"]
                     == tag1_id for t in tags)
    found_tag2 = any(t["name"] == tag_name2 for t in tags)
    assert found_tag1
    assert found_tag2


def test_create_tag_missing_name(test_client, auth_headers_tags):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    response = test_client.post("/api/tags", headers=headers, json={})
    assert response.status_code == 400
    assert response.json["message"] == "Tag name is required"

    response_empty = test_client.post(
        "/api/tags", headers=headers, json={"name": "   "}
    )
    assert response_empty.status_code == 400
    assert response_empty.json["message"] == "Tag name is required"


# POST /api/tasks/<task_id>/tags
def test_add_tag_to_task_by_id_and_name(
    test_client, auth_headers_tags, created_task_for_tags, db_session
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]
    project_id = created_task_for_tags["project_id"]  # For activity log check

    # Create a tag first
    tag_name_existing = "ExistingTag"
    tag_create_res = test_client.post(
        "/api/tags", headers=headers, json={"name": tag_name_existing}
    )
    assert tag_create_res.status_code == 201
    existing_tag_id = tag_create_res.json["id"]

    # 1. Add existing tag by ID
    response_add_by_id = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": existing_tag_id}
    )
    assert response_add_by_id.status_code == 200  # API returns 200 for this
    task_data = response_add_by_id.json
    assert len(task_data["tags"]) == 1
    assert task_data["tags"][0]["id"] == existing_tag_id
    assert task_data["tags"][0]["name"] == tag_name_existing

    # Verify activity log for adding by ID
    project_activities = test_client.get(
        f"/api/projects/{project_id}/activities", headers=headers
    ).json
    assert any(
        a["action_type"] == "TAG_ADDED_TO_TASK"
        and a["task_id"] == task_id
        and f"added tag '{tag_name_existing}'" in a["description"]
        for a in project_activities
    ), "TAG_ADDED_TO_TASK (by ID) activity not found"

    # 2. Add new tag by name (should create the tag)
    tag_name_new = "NewTagByName"
    response_add_by_name = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_name": tag_name_new}
    )
    assert response_add_by_name.status_code == 200
    task_data_2 = response_add_by_name.json
    assert len(task_data_2["tags"]) == 2

    newly_added_tag = next(
        t for t in task_data_2["tags"] if t["name"] == tag_name_new)
    assert newly_added_tag is not None

    # Verify tag was created in DB
    tag_db = db_session.query(Tag).filter_by(name=tag_name_new).first()
    assert tag_db is not None
    assert tag_db.id == newly_added_tag["id"]

    # Verify activity log for adding by Name
    project_activities_after_new_tag = test_client.get(
        f"/api/projects/{project_id}/activities", headers=headers
    ).json
    assert any(
        a["action_type"] == "TAG_ADDED_TO_TASK"
        and a["task_id"] == task_id
        and f"added tag '{tag_name_new}'" in a["description"]
        for a in project_activities_after_new_tag
    ), "TAG_ADDED_TO_TASK (by Name) activity not found"

    # 3. Add tag that's already on the task
    response_add_again = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": existing_tag_id}
    )
    assert (
        response_add_again.status_code == 200
    )  # Should be idempotent or indicate already present
    assert len(response_add_again.json["tags"]) == 2  # Count should not change


def test_add_tag_to_task_invalid_input(
    test_client, auth_headers_tags, created_task_for_tags
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]

    # No tag_id or tag_name
    response = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={})
    assert response.status_code == 400
    assert response.json["message"] == "Either tag_name or tag_id is required"

    # Non-existent tag_id
    response_bad_id = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": 9999}
    )
    assert response_bad_id.status_code == 404
    assert "Tag with id 9999 not found" in response_bad_id.json["message"]


def test_add_tag_to_non_existent_task(test_client, auth_headers_tags):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    response = test_client.post(
        "/api/tasks/8888/tags", headers=headers, json={"tag_name": "SomeTag"}
    )
    assert response.status_code == 404
    assert response.json["message"] == "Task not found"


def test_add_tag_to_task_unauthorized(
    test_client, created_task_for_tags
):  # No auth headers
    task_id = created_task_for_tags["task_id"]
    response = test_client.post(
        f"/api/tasks/{task_id}/tags", json={"tag_name": "UnauthorizedTag"}
    )
    assert response.status_code == 401


# DELETE /api/tasks/<task_id>/tags/<tag_id>
def test_remove_tag_from_task(
    test_client, auth_headers_tags, created_task_for_tags, db_session
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]
    project_id = created_task_for_tags["project_id"]

    # Add two tags first
    tag1_name = "TagToRemove1"
    tag2_name = "TagToKeep"
    tag1_res = test_client.post(
        "/api/tags", headers=headers, json={"name": tag1_name})
    tag1_id = tag1_res.json["id"]
    tag2_res = test_client.post(
        "/api/tags", headers=headers, json={"name": tag2_name})
    tag2_id = tag2_res.json["id"]

    test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": tag1_id}
    )
    test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": tag2_id}
    )

    task_res_before_delete = test_client.get(
        f"/api/tasks/{task_id}", headers=headers)
    assert len(task_res_before_delete.json["tags"]) == 2

    # Remove tag1
    response_delete = test_client.delete(
        f"/api/tasks/{task_id}/tags/{tag1_id}", headers=headers
    )
    assert response_delete.status_code == 204

    # Verify tag removed from task
    task_res_after_delete = test_client.get(
        f"/api/tasks/{task_id}", headers=headers)
    assert len(task_res_after_delete.json["tags"]) == 1
    assert task_res_after_delete.json["tags"][0]["id"] == tag2_id

    # Verify activity log for tag removal
    project_activities = test_client.get(
        f"/api/projects/{project_id}/activities", headers=headers
    ).json
    assert any(
        a["action_type"] == "TAG_REMOVED_FROM_TASK"
        and a["task_id"] == task_id
        and f"removed tag '{tag1_name}'" in a["description"]
        for a in project_activities
    ), (
        "TAG_REMOVED_FROM_TASK activity not found"
    )

    # Attempt to remove a tag not on the task (or already removed)
    response_delete_again = test_client.delete(
        f"/api/tasks/{task_id}/tags/{tag1_id}", headers=headers
    )
    assert response_delete_again.status_code == 404  # As per current API spec
    assert response_delete_again.json["message"] == "Tag not found on this task"

    # Attempt to remove non-existent tag
    response_delete_non_tag = test_client.delete(
        f"/api/tasks/{task_id}/tags/7777", headers=headers
    )
    assert response_delete_non_tag.status_code == 404
    assert response_delete_non_tag.json["message"] == "Tag with id 7777 not found"


def test_remove_tag_unauthorized_or_forbidden(
    test_client, auth_headers_tags, created_task_for_tags
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]
    tag_to_add_res = test_client.post(
        "/api/tags", headers=headers, json={"name": "TempTagForDeleteTest"}
    )
    tag_id = tag_to_add_res.json["id"]
    test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": tag_id}
    )

    # No token
    response_no_token = test_client.delete(
        f"/api/tasks/{task_id}/tags/{tag_id}")
    assert response_no_token.status_code == 401

    # Different user
    email_other = "other_tags_user@example.com"
    test_client.post(
        "/api/auth/register",
        json={
            "username": "other_tags",
            "email": email_other,
            "password": "opass"
        },
    )
    login_res_other = test_client.post(
        "/api/auth/login", json={"email": email_other, "password": "opass"}
    )
    headers_other_user = {
        "Authorization": f"Bearer {login_res_other.json['access_token']}"
    }

    response_forbidden = test_client.delete(
        f"/api/tasks/{task_id}/tags/{tag_id}", headers=headers_other_user
    )
    assert response_forbidden.status_code == 403


# Test Task.to_dict() includes tags
def test_task_to_dict_includes_tags(
    test_client, auth_headers_tags, created_task_for_tags, db_session
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]

    # Add some tags
    tag_names = ["AlphaTag", "BetaTag"]
    for name in tag_names:
        tag_res = test_client.post(
            "/api/tags", headers=headers, json={"name": name})
        tag_id = tag_res.json["id"]
        test_client.post(
            f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_id": tag_id}
        )

    # Fetch the task directly
    response_get_task = test_client.get(
        f"/api/tasks/{task_id}", headers=headers)
    assert response_get_task.status_code == 200
    task_data = response_get_task.json

    assert "tags" in task_data
    assert isinstance(task_data["tags"], list)
    assert len(task_data["tags"]) == len(tag_names)

    fetched_tag_names = sorted([t["name"] for t in task_data["tags"]])
    assert fetched_tag_names == sorted(tag_names)

    # Also check when listing tasks for a stage (if applicable, though not explicitly required for this test)
    # This ensures the to_dict() in the Task model is consistently providing tags.
    # To do this, we need stage_id from created_task_for_tags (modify fixture or pass it)
    # For now, focusing on direct task fetch.

    # Test with include_tags=False (if Task.to_dict() supports it, which it does per model definition)
    # This requires direct model testing, not API testing unless API exposes this param.
    # The API currently always includes tags for /api/tasks/<task_id>
    task_model = db_session.query(Task).get(task_id)
    task_dict_no_tags = task_model.to_dict(include_tags=False)
    assert "tags" in task_dict_no_tags  # key exists
    # but is empty as per include_tags=False
    assert task_dict_no_tags["tags"] == []

    task_dict_with_tags = task_model.to_dict(include_tags=True)  # default
    assert len(task_dict_with_tags["tags"]) == len(tag_names)

    task_dict_default = task_model.to_dict()  # default should be include_tags=True
    assert len(task_dict_default["tags"]) == len(tag_names)


# Test that activity log is created for tag add/remove (already covered in add/remove tests)
# No need for a separate test if those are comprehensive.

# Test create tag with very long name (if there are limits)
# Test create tag with special characters


# Test adding tag by name where name is mixed case (should find existing if present, or create with given case)
def test_add_tag_by_mixed_case_name(
    test_client, auth_headers_tags, created_task_for_tags, db_session
):
    headers = {"Authorization": auth_headers_tags["Authorization"]}
    task_id = created_task_for_tags["task_id"]

    # 1. Create a tag with a specific casing
    original_tag_name = "MixedCaseTag"
    tag_create_res = test_client.post(
        "/api/tags", headers=headers, json={"name": original_tag_name}
    )
    assert tag_create_res.status_code == 201
    original_tag_id = tag_create_res.json["id"]

    # 2. Add tag to task using a different casing for the name
    mixed_case_name_to_add = "mixedcasetag"
    response_add = test_client.post(
        f"/api/tasks/{task_id}/tags",
        headers=headers,
        json={"tag_name": mixed_case_name_to_add},
    )
    assert response_add.status_code == 200
    task_data = response_add.json

    # Should have used the existing tag, preserving its original casing and ID
    assert len(task_data["tags"]) == 1
    assert task_data["tags"][0]["id"] == original_tag_id
    assert (
        task_data["tags"][0]["name"] == original_tag_name
    )  # Important: name should be original case

    # Verify no new tag was created
    tags_list_res = test_client.get("/api/tags", headers=headers)
    tags_in_db = tags_list_res.json
    count = sum(
        1 for t in tags_in_db
        if t["name"].lower() == original_tag_name.lower()
    )
    assert count == 1

    # 3. Add another tag by name, this time a completely new one with mixed case
    new_mixed_name = "AnotherNewMix"
    response_add_new = test_client.post(
        f"/api/tasks/{task_id}/tags", headers=headers, json={"tag_name": new_mixed_name}
    )
    assert response_add_new.status_code == 200
    task_data_new = response_add_new.json
    assert len(task_data_new["tags"]) == 2

    added_tag_info = next(
        t for t in task_data_new["tags"] if t["name"] == new_mixed_name
    )
    assert added_tag_info is not None  # Tag was created with the provided casing

    # Verify it was created with the given casing
    tag_db_check = db_session.query(Tag).filter_by(
        id=added_tag_info["id"]).first()
    assert tag_db_check is not None
    assert tag_db_check.name == new_mixed_name
