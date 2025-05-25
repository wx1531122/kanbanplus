from backend.app import db
from backend.app.models import ActivityLog, User

def record_activity(action_type: str, user_id: int, description: str, project_id: int = None, task_id: int = None):
    """
    Records an activity in the ActivityLog.

    Args:
        action_type (str): The type of action performed (e.g., "TASK_CREATED").
        user_id (int): The ID of the user who performed the action.
        description (str): A description of the activity.
        project_id (int, optional): The ID of the project related to the activity. Defaults to None.
        task_id (int, optional): The ID of the task related to the activity. Defaults to None.
    """
    try:
        activity = ActivityLog(
            action_type=action_type,
            user_id=user_id,
            description=description,
            project_id=project_id,
            task_id=task_id
        )
        db.session.add(activity)
        db.session.commit()
    except Exception as e:
        # TODO: Add more robust error handling/logging (e.g., Sentry, specific logger)
        print(f"Error recording activity: {e}")
        db.session.rollback()
        # Optionally re-raise or handle as appropriate for the application
        # raise
