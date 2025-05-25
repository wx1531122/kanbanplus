import pytest
import json
from backend.app.models import User, Project, Stage, Task, Comment, ActivityLog

# Fixtures `auth_headers` and `created_task_data` are now in conftest.py

# --- Test Cases for ActivityLog API ---

def test_get_project_activities_success(test_client, auth_headers, created_task_data, db_session):
    project_id = created_task_data['project_id']
    project_name = created_task_data['project_name'] # from created_task_data
    task_content_ellipsis = created_task_data['task_content'][:30] + '...'
    stage_name = created_task_data['stage_name'] # from created_task_data
    username = auth_headers['username'] # from auth_headers
    request_headers = {'Authorization': auth_headers['Authorization']}

    # Add a comment to generate more activity
    task_id = created_task_data['task_id']
    comment_res = test_client.post(f'/api/tasks/{task_id}/comments', headers=request_headers, json={'content': 'A test comment for activity'})
    assert comment_res.status_code == 201

    response = test_client.get(f'/api/projects/{project_id}/activities', headers=request_headers)
    assert response.status_code == 200
    activities = response.json
    assert isinstance(activities, list)
    # Project created, Stage created (not explicitly logged by default), Task created, Comment added
    # So, at least 3 explicitly logged activities by our current setup.
    assert len(activities) >= 3 

    # Check order (most recent first)
    if len(activities) > 1: # Ensure there's more than one activity to compare
        assert activities[0]['created_at'] >= activities[1]['created_at']

    # Check some content (details might vary based on exact description format)
    # The order of activities can be: Comment Added, Task Created, Project Created (most recent first)
    
    # Find PROJECT_CREATED activity
    project_created_activity = next((act for act in activities if act['action_type'] == 'PROJECT_CREATED'), None)
    assert project_created_activity is not None
    assert f"User '{username}' created project '{project_name}'" in project_created_activity['description']
    assert project_created_activity['user_username'] == username
    assert project_created_activity['project_id'] == project_id

    # Find TASK_CREATED activity
    task_created_activity = next((act for act in activities if act['action_type'] == 'TASK_CREATED'), None)
    assert task_created_activity is not None
    assert f"User '{username}' created task '{task_content_ellipsis}' in stage '{stage_name}'" in task_created_activity['description']
    assert task_created_activity['user_username'] == username
    assert task_created_activity['project_id'] == project_id
    assert task_created_activity['task_id'] == task_id

    # Find COMMENT_ADDED activity
    comment_added_activity = next((act for act in activities if act['action_type'] == 'COMMENT_ADDED'), None)
    assert comment_added_activity is not None
    assert f"User '{username}' commented on task '{task_content_ellipsis}'" in comment_added_activity['description']
    assert comment_added_activity['user_username'] == username
    assert comment_added_activity['project_id'] == project_id
    assert comment_added_activity['task_id'] == task_id


def test_get_task_activities_success(test_client, auth_headers, created_task_data, db_session):
    task_id = created_task_data['task_id']
    project_id = created_task_data['project_id'] # For checking consistency
    task_content_ellipsis = created_task_data['task_content'][:30] + '...'
    username = auth_headers['username']
    request_headers = {'Authorization': auth_headers['Authorization']}

    # Add a comment
    comment_res = test_client.post(f'/api/tasks/{task_id}/comments', headers=request_headers, json={'content': 'Another comment for task activity'})
    assert comment_res.status_code == 201
    
    # Update the task
    updated_task_content = 'Updated task content for activity'
    update_res = test_client.put(f'/api/tasks/{task_id}', headers=request_headers, json={'content': updated_task_content})
    assert update_res.status_code == 200


    response = test_client.get(f'/api/tasks/{task_id}/activities', headers=request_headers)
    assert response.status_code == 200
    activities = response.json
    assert isinstance(activities, list)
    assert len(activities) >= 3 # Task Created, Comment Added, Task Updated (could be more if fixture logs stage creation etc.)

    # TASK_UPDATED should be the most recent
    task_updated_activity = next((act for act in activities if act['action_type'] == 'TASK_UPDATED'), None)
    assert task_updated_activity is not None
    assert f"User '{username}' updated task '{updated_task_content[:30]}...'" in task_updated_activity['description']
    assert task_updated_activity['user_username'] == username
    assert task_updated_activity['task_id'] == task_id
    assert task_updated_activity['project_id'] == project_id

    # COMMENT_ADDED
    comment_added_activity = next((act for act in activities if act['action_type'] == 'COMMENT_ADDED'), None)
    assert comment_added_activity is not None
    # Note: The description for comment activity uses the task content *at the time of commenting*.
    # If the task was updated after the comment, the description reflects the older task content.
    # Here, task_content_ellipsis is the original content. The update happened *after* the comment.
    assert f"User '{username}' commented on task '{task_content_ellipsis}'" in comment_added_activity['description']
    assert comment_added_activity['user_username'] == username
    assert comment_added_activity['task_id'] == task_id
    assert comment_added_activity['project_id'] == project_id
    
    # TASK_CREATED
    task_created_activity = next((act for act in activities if act['action_type'] == 'TASK_CREATED'), None)
    assert task_created_activity is not None
    assert task_created_activity['user_username'] == username
    assert task_created_activity['task_id'] == task_id
    assert task_created_activity['project_id'] == project_id


def test_get_activities_non_existent_project(test_client, auth_headers):
    request_headers = {'Authorization': auth_headers['Authorization']}
    response = test_client.get('/api/projects/99999/activities', headers=request_headers)
    assert response.status_code == 404
    assert response.json['message'] == 'Project not found'

def test_get_activities_non_existent_task(test_client, auth_headers):
    request_headers = {'Authorization': auth_headers['Authorization']}
    response = test_client.get('/api/tasks/99998/activities', headers=request_headers)
    assert response.status_code == 404
    assert response.json['message'] == 'Task not found'

def test_get_activities_unauthorized_no_token(test_client, created_task_data):
    project_id = created_task_data['project_id']
    task_id = created_task_data['task_id']

    response_project = test_client.get(f'/api/projects/{project_id}/activities')
    assert response_project.status_code == 401
    
    response_task = test_client.get(f'/api/tasks/{task_id}/activities')
    assert response_task.status_code == 401

@pytest.fixture(scope='function')
def another_user_auth_headers_activity(test_client, db_session): # Renamed from general another_user_auth_headers
    email = 'anotheractivityuser@example.com'
    password = 'password789'
    username = 'another_activity_user'
    
    register_response = test_client.post('/api/auth/register', json={'username': username, 'email': email, 'password': password})
    assert register_response.status_code in [201, 409] # Allow for existing user in less isolated test runs

    login_response = test_client.post('/api/auth/login', json={'email': email, 'password': password})
    assert login_response.status_code == 200
    access_token = login_response.json['access_token']
    return {'Authorization': f'Bearer {access_token}'}

def test_get_activities_forbidden_other_user(test_client, created_task_data, another_user_auth_headers_activity):
    project_id = created_task_data['project_id'] # Created by first user (auth_headers fixture user)
    task_id = created_task_data['task_id']       # Created by first user
    headers_other_user = another_user_auth_headers_activity # Token for a different user

    response_project = test_client.get(f'/api/projects/{project_id}/activities', headers=headers_other_user)
    assert response_project.status_code == 403
    assert response_project.json['message'] == 'Access forbidden to this project'

    response_task = test_client.get(f'/api/tasks/{task_id}/activities', headers=headers_other_user)
    assert response_task.status_code == 403
    assert response_task.json['message'] == 'Access forbidden to this task'


# Test direct call to activity_service
def test_record_activity_service_directly(db_session, auth_headers, created_task_data):
    from backend.app.services.activity_service import record_activity
    
    user_id = auth_headers['user_id']
    username = auth_headers['username'] # Get username from shared fixture
    project_id = created_task_data['project_id']
    task_id = created_task_data['task_id']
    
    action = "CUSTOM_ACTION"
    desc = "A custom action was performed by a test."
    
    record_activity(action_type=action, user_id=user_id, description=desc, project_id=project_id, task_id=task_id)
    
    log_entry = db_session.query(ActivityLog).filter_by(action_type=action, description=desc).first()
    assert log_entry is not None
    assert log_entry.user_id == user_id
    assert log_entry.project_id == project_id
    assert log_entry.task_id == task_id
    assert log_entry.user.username == username # Check username via relationship

# Test for task deletion activity
def test_task_deletion_logs_activity(test_client, auth_headers, created_task_data, db_session):
    project_id = created_task_data['project_id']
    task_id = created_task_data['task_id']
    username = auth_headers['username']
    request_headers = {'Authorization': auth_headers['Authorization']}

    # Delete the task
    delete_response = test_client.delete(f'/api/tasks/{task_id}', headers=request_headers)
    assert delete_response.status_code == 204

    # Check project activities
    response = test_client.get(f'/api/projects/{project_id}/activities', headers=request_headers)
    assert response.status_code == 200
    activities = response.json
    
    delete_activity_found = False
    for activity in activities:
        if activity['action_type'] == 'TASK_DELETED' and activity['task_id'] == task_id:
            delete_activity_found = True
            assert f"User '{username}' deleted task" in activity['description']
            break
    assert delete_activity_found, "TASK_DELETED activity not found for deleted task"

    # Task activities endpoint for the deleted task should ideally be 404 or return specific logs
    # For now, we'll assume the task is gone, so its specific activity log might not be the primary check point after deletion
    # but the project log should reflect it.
    # If /api/tasks/<task_id>/activities were to return logs even after deletion (e.g. if task is soft-deleted or logs are retained),
    # this would need a different test. Current implementation hard deletes task, so logs associated via task_id remain but endpoint for task itself is 404.

    # Verify the log exists in the database directly
    log_entry = db_session.query(ActivityLog).filter(
        ActivityLog.action_type == "TASK_DELETED",
        ActivityLog.task_id == task_id,
        ActivityLog.project_id == project_id
    ).first()
    assert log_entry is not None
    assert f"User '{username}' deleted task" in log_entry.description
    assert log_entry.user_id == auth_headers_activity['user_id']

# Test that Task.to_dict() is not relevant here as activity logs are separate
# The check for Task.to_dict for *tags* will be in test_tags_api.py.
# Activity logs are not directly part of Task.to_dict().
