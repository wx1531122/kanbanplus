import pytest
from backend.app.models import User, Project
from backend.app import db # db fixture is from conftest.py

def test_user_creation(db_session): # Use db_session for transactional tests
    """Test User model creation and password hashing."""
    user = User(username='testuser', email='test@example.com')
    user.set_password('securepassword123')
    
    db_session.add(user)
    db_session.commit() # Commit to save the user and generate ID

    retrieved_user = User.query.get(user.id)
    assert retrieved_user is not None
    assert retrieved_user.username == 'testuser'
    assert retrieved_user.email == 'test@example.com'
    assert retrieved_user.password_hash != 'securepassword123'
    assert retrieved_user.check_password('securepassword123')
    assert not retrieved_user.check_password('wrongpassword')

def test_project_creation(db_session): # Use db_session
    """Test Project model creation."""
    # A project requires a user, so create one first
    user = User(username='projectowner', email='owner@example.com')
    user.set_password('password')
    db_session.add(user)
    db_session.commit()

    project = Project(name='Test Project', description='A sample project.', user_id=user.id)
    db_session.add(project)
    db_session.commit()

    retrieved_project = Project.query.get(project.id)
    assert retrieved_project is not None
    assert retrieved_project.name == 'Test Project'
    assert retrieved_project.user_id == user.id
    assert retrieved_project.author.username == 'projectowner'

# Add more model tests as needed, e.g., for Stage, Task, SubTask
# For example:
# def test_stage_creation(db_session):
#     user = User(username='stageuser', email='stageuser@example.com')
#     user.set_password('password')
#     db_session.add(user)
#     db_session.commit()

#     project = Project(name='Stage Project', user_id=user.id)
#     db_session.add(project)
#     db_session.commit()

#     stage = Stage(name='To Do', project_id=project.id, order=1)
#     db_session.add(stage)
#     db_session.commit()
    
#     assert stage.id is not None
#     assert stage.name == 'To Do'
#     assert stage.project_id == project.id
