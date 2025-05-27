from backend.app import db
from backend.app.models import ActivityLog


def record_activity(
    action_type: str,
    user_id: int,
    description: str,
    project_id: int = None,
    task_id: int = None,
    details: dict = None,
):
    """
    Records an activity in the ActivityLog.

    Args:
        action_type (str): The type of action performed (e.g., "TASK_CREATED").
        user_id (int): The ID of the user who performed the action.
        description (str): A description of the activity.
        project_id (int, optional): The ID of the project related to the
            activity. Defaults to None.
        task_id (int, optional): The ID of the task related to the activity.
            Defaults to None.
        details (dict, optional): Additional details about the activity.
            Defaults to None.
    """
    activity = ActivityLog(  # This instantiation should be correct now
        action_type=action_type,
        user_id=user_id,
        description=description,
        project_id=project_id,
        task_id=task_id,
        details=details,
    )
    try:
        db.session.add(activity)
        db.session.commit()  # Ensure commit is attempted
    except Exception:
        db.session.rollback()
        # Optional: Log the error e.g., current_app.logger.error(f"Error recording activity: {e}")
        raise  # Re-raise to allow calling transaction to handle it
