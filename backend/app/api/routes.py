from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.models import (
    User,
    Project,
    Stage,
    Task,
    SubTask,
    Comment,
    ActivityLog,
    Tag,
)  # Import all models
from backend.app import db  # Import db
from datetime import datetime  # For due_date parsing
from backend.app.services.activity_service import record_activity
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "API is up and running!"}), 200


# Test/Protected Route (can be removed or kept for testing)
@api_bp.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))  # Cast to int
    if user:
        return jsonify(logged_in_as=user.to_dict()), 200
    return jsonify(message="User not found"), 404


# === Project Endpoints ===


@api_bp.route("/projects", methods=["POST"])
@jwt_required()
def create_project():
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    data = request.get_json()

    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"message": "Project name is required"}), 400

    name = data["name"].strip()
    description = data.get("description", "").strip()

    project = Project(
        name=name, description=description, user_id=current_user_id_int
    )  # Use int
    db.session.add(project)
    db.session.commit()

    user = User.query.get(current_user_id_int)  # Use int
    record_activity(
        action_type="PROJECT_CREATED",
        description=f"User '{user.username}' created project '{project.name}'",
        user_id=current_user_id_int,  # Use int
        project_id=project.id,
    )
    return jsonify(project.to_dict()), 201


@api_bp.route("/projects", methods=["GET"])
@jwt_required()
def get_projects():
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    projects = (
        Project.query.filter_by(user_id=current_user_id_int)  # Use int
        .order_by(Project.created_at.desc())
        .all()
    )
    return jsonify([project.to_dict() for project in projects]), 200


@api_bp.route("/projects/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden"}), 403

    # Optionally include stages and tasks by default if useful
    return jsonify(project.to_dict(include_stages=True)), 200


@api_bp.route("/projects/<int:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    updated = False
    if "name" in data and data["name"].strip():
        project.name = data["name"].strip()
        updated = True
    if "description" in data:  # Allow empty description
        project.description = data["description"].strip()
        updated = True

    if updated:
        db.session.commit()
    return jsonify(project.to_dict()), 200


@api_bp.route("/projects/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden"}), 403

    db.session.delete(project)
    db.session.commit()
    return "", 204


# === Stage Endpoints ===


@api_bp.route("/projects/<int:project_id>/stages", methods=["POST"])
@jwt_required()
def create_stage(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this project"}), 403

    data = request.get_json()
    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"message": "Stage name is required"}), 400

    name = data["name"].strip()
    order = data.get("order")  # Can be None

    stage = Stage(name=name, project_id=project.id, order=order)
    db.session.add(stage)
    db.session.commit()
    return jsonify(stage.to_dict()), 201


@api_bp.route("/projects/<int:project_id>/stages", methods=["GET"])
@jwt_required()
def get_stages_for_project(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this project"}), 403

    stages = (
        Stage.query.filter_by(project_id=project.id)
        .order_by(Stage.order, Stage.created_at)
        .all()
    )
    return jsonify([stage.to_dict() for stage in stages]), 200


@api_bp.route("/stages/<int:stage_id>", methods=["PUT"])
@jwt_required()
def update_stage(stage_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({"message": "Stage not found"}), 404
    # Check ownership via project
    if stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this stage"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    updated = False
    if "name" in data and data["name"].strip():
        stage.name = data["name"].strip()
        updated = True
    if "order" in data:  # order can be 0, so check for presence
        stage.order = data["order"]
        updated = True
    # For V1, not allowing moving stage to another project via this endpoint.
    # If 'project_id' were allowed, further checks for the new project's ownership would be needed.

    if updated:
        db.session.commit()
    return jsonify(stage.to_dict()), 200


@api_bp.route("/stages/<int:stage_id>", methods=["DELETE"])
@jwt_required()
def delete_stage(stage_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({"message": "Stage not found"}), 404
    if (
        stage.project.user_id != current_user_id_int
    ):  # Check ownership via project # Use int
        return jsonify({"message": "Access forbidden to this stage"}), 403

    db.session.delete(stage)
    db.session.commit()
    return "", 204


# === Task Endpoints ===


@api_bp.route("/stages/<int:stage_id>/tasks", methods=["POST"])
@jwt_required()
def create_task(stage_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({"message": "Stage not found"}), 404
    if stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this stage"}), 403

    data = request.get_json()
    if not data or "content" not in data or not data["content"].strip():
        return jsonify({"message": "Task content is required"}), 400

    content = data["content"].strip()
    assignee = data.get("assignee", "").strip()
    priority = data.get("priority", "").strip()
    order = data.get("order")  # Can be None

    due_date_str = data.get("due_date")
    due_date_obj = None
    if due_date_str:
        try:
            due_date_obj = datetime.fromisoformat(due_date_str)
        except ValueError:
            return (
                jsonify(
                    {
                        "message": (
                            "Invalid due_date format. Use ISO format "
                            "(YYYY-MM-DDTHH:MM:SS) or (YYYY-MM-DD)."
                        )
                    }
                ),
                400,
            )

    task = Task(
        content=content,
        stage_id=stage.id,
        assignee=assignee,
        due_date=due_date_obj,
        priority=priority,
        order=order,
    )
    db.session.add(task)
    db.session.commit()

    user = User.query.get(current_user_id_int)  # Use int
    record_activity(
        action_type="TASK_CREATED",
        description=(
            f"User '{user.username}' created task '{task.content[:30]}...' "
            f"in stage '{stage.name}'"
        ),
        user_id=current_user_id_int,  # Use int
        project_id=stage.project_id,
        task_id=task.id,
    )
    return jsonify(task.to_dict()), 201


@api_bp.route("/stages/<int:stage_id>/tasks", methods=["GET"])
@jwt_required()
def get_tasks_for_stage(stage_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({"message": "Stage not found"}), 404
    if stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this stage"}), 403

    tasks = (
        Task.query.filter_by(stage_id=stage.id)
        .order_by(Task.order, Task.created_at)
        .all()
    )
    return jsonify([task.to_dict() for task in tasks]), 200


@api_bp.route("/tasks/<int:task_id>", methods=["GET"])
@jwt_required()
def get_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    return jsonify(task.to_dict(include_subtasks=True)), 200


@api_bp.route("/tasks/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    updated = False
    if "content" in data and data["content"].strip():
        task.content = data["content"].strip()
        updated = True
    if "assignee" in data:
        task.assignee = data["assignee"].strip()
        updated = True
    if "priority" in data:
        task.priority = data["priority"].strip()
        updated = True
    if "order" in data:
        task.order = data["order"]
        updated = True
    if "due_date" in data:
        due_date_str = data.get("due_date")
        if due_date_str:
            try:
                task.due_date = datetime.fromisoformat(due_date_str)
            except ValueError:
                return (
                    jsonify(
                        {
                            "message": (
                                "Invalid due_date format. Use ISO format "
                                "(YYYY-MM-DDTHH:MM:SS) or (YYYY-MM-DD)."
                            )
                        }
                    ),
                    400,
                )
        else:  # Allow clearing due_date
            task.due_date = None
        updated = True

    if "stage_id" in data:
        new_stage_id = data["stage_id"]
        if new_stage_id != task.stage_id:
            new_stage = Stage.query.get(new_stage_id)
            if not new_stage:
                return jsonify({"message": "New stage not found"}), 404
            if new_stage.project.user_id != current_user_id_int:  # Use int
                return jsonify({"message": "Access forbidden to new stage"}), 403
            task.stage_id = new_stage_id
            updated = True

    if updated:
        db.session.commit()
        user = User.query.get(current_user_id_int)  # Use int
        record_activity(
            action_type="TASK_UPDATED",
            description=(
                f"User '{user.username}' updated task " f"'{task.content[:30]}...'"
            ),
            user_id=current_user_id_int,  # Use int
            project_id=task.stage.project.id,
            task_id=task.id,
        )
    return jsonify(task.to_dict()), 200


@api_bp.route("/tasks/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    # Explicitly fetch user and details needed for the log before any delete operation
    user_for_log = User.query.get(current_user_id_int)
    if not user_for_log:
        # Fallback or error if user somehow not found, though JWT should protect this
        log_username = "Unknown User"
    else:
        log_username = user_for_log.username

    task_content_for_log = task.content
    stage_name_for_log = task.stage.name
    project_id_for_log = task.stage.project.id
    task_id_for_log = task.id

    # Record activity before deleting the task
    record_activity(
        action_type="TASK_DELETED",
        description=(
            f"User '{log_username}' deleted task "
            f"'{task_content_for_log[:30]}...' from stage '{stage_name_for_log}'"
        ),
        user_id=current_user_id_int,
        project_id=project_id_for_log,
        task_id=task_id_for_log,
    )
    db.session.delete(task)
    db.session.commit()
    return "", 204


# === SubTask Endpoints ===


@api_bp.route("/tasks/<int:task_id>/subtasks", methods=["POST"])
@jwt_required()
def create_subtask(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Parent task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to parent task"}), 403

    data = request.get_json()
    if not data or "content" not in data or not data["content"].strip():
        return jsonify({"message": "SubTask content is required"}), 400

    content = data["content"].strip()
    completed = data.get("completed", False)
    order = data.get("order")  # Can be None

    if not isinstance(completed, bool):
        return (
            jsonify({"message": "Invalid format for completed flag, must be boolean."}),
            400,
        )

    subtask = SubTask(
        content=content,
        parent_task_id=task.id,
        completed=completed,
        order=order,
    )
    db.session.add(subtask)
    db.session.commit()
    return jsonify(subtask.to_dict()), 201


@api_bp.route("/tasks/<int:task_id>/subtasks", methods=["GET"])
@jwt_required()
def get_subtasks_for_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Parent task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to parent task"}), 403

    subtasks = (
        SubTask.query.filter_by(parent_task_id=task.id)
        .order_by(SubTask.order, SubTask.created_at)
        .all()
    )
    return jsonify([subtask.to_dict() for subtask in subtasks]), 200


@api_bp.route("/subtasks/<int:subtask_id>", methods=["PUT"])
@jwt_required()
def update_subtask(subtask_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    subtask = SubTask.query.get(subtask_id)

    if not subtask:
        return jsonify({"message": "SubTask not found"}), 404
    if subtask.parent_task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this subtask"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data provided"}), 400

    updated = False
    if "content" in data and data["content"].strip():
        subtask.content = data["content"].strip()
        updated = True
    if "completed" in data:
        completed_val = data["completed"]
        if not isinstance(completed_val, bool):
            return (
                jsonify(
                    {"message": "Invalid format for completed flag, must be boolean."}
                ),
                400,
            )
        subtask.completed = completed_val
        updated = True
    if "order" in data:
        subtask.order = data["order"]
        updated = True
    # For V1, not allowing moving subtask to another parent task via this endpoint.

    if updated:
        db.session.commit()
    return jsonify(subtask.to_dict()), 200


@api_bp.route("/subtasks/<int:subtask_id>", methods=["DELETE"])
@jwt_required()
def delete_subtask(subtask_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    subtask = SubTask.query.get(subtask_id)

    if not subtask:
        return jsonify({"message": "SubTask not found"}), 404
    if subtask.parent_task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this subtask"}), 403

    db.session.delete(subtask)
    db.session.commit()
    return "", 204


# === Comment Endpoints ===


@api_bp.route("/tasks/<int:task_id>/comments", methods=["POST"])
@jwt_required()
def create_comment(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    data = request.get_json()
    if not data or "content" not in data or not data["content"].strip():
        return jsonify({"message": "Comment content is required"}), 400

    content = data["content"].strip()

    comment = Comment(
        content=content, task_id=task.id, user_id=current_user_id_int
    )  # Use int
    db.session.add(comment)
    db.session.commit()

    user = User.query.get(current_user_id_int)  # Use int
    record_activity(
        action_type="COMMENT_ADDED",
        description=(
            f"User '{user.username}' commented on task " f"'{task.content[:30]}...'"
        ),
        user_id=current_user_id_int,  # Use int
        project_id=task.stage.project.id,
        task_id=task.id,
    )
    return jsonify(comment.to_dict()), 201


@api_bp.route("/tasks/<int:task_id>/comments", methods=["GET"])
@jwt_required()
def get_comments_for_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    comments = (
        Comment.query.filter_by(task_id=task.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return jsonify([comment.to_dict() for comment in comments]), 200


# === ActivityLog Endpoints ===


@api_bp.route("/projects/<int:project_id>/activities", methods=["GET"])
@jwt_required()
def get_project_activities(project_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    project = Project.query.get(project_id)

    if not project:
        return jsonify({"message": "Project not found"}), 404
    if project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this project"}), 403

    activities = (
        ActivityLog.query.filter_by(project_id=project_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    return jsonify([activity.to_dict() for activity in activities]), 200


@api_bp.route("/tasks/<int:task_id>/activities", methods=["GET"])
@jwt_required()
def get_task_activities(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if (
        task.stage.project.user_id != current_user_id_int
    ):  # Check ownership via project # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    activities = (
        ActivityLog.query.filter_by(task_id=task_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )
    return jsonify([activity.to_dict() for activity in activities]), 200


# === Tag Endpoints ===


@api_bp.route("/tags", methods=["GET"])
@jwt_required()
def get_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([tag.to_dict() for tag in tags]), 200


@api_bp.route("/tags", methods=["POST"])
@jwt_required()
def create_tag():
    data = request.get_json()
    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"message": "Tag name is required"}), 400

    name = data["name"].strip()
    existing_tag = Tag.query.filter(db.func.lower(Tag.name) == name.lower()).first()

    if existing_tag:
        return jsonify(existing_tag.to_dict()), 200

    tag = Tag(name=name)
    db.session.add(tag)
    try:
        db.session.commit()
    except (
        IntegrityError
    ):  # Handles potential race conditions if another request creates the same tag
        db.session.rollback()
        existing_tag = Tag.query.filter(db.func.lower(Tag.name) == name.lower()).first()
        if existing_tag:
            return jsonify(existing_tag.to_dict()), 200
        else:
            # This case should ideally not be reached
            return (
                jsonify({"message": "Error creating tag, possibly due to a conflict."}),
                500,
            )

    return jsonify(tag.to_dict()), 201


@api_bp.route("/tasks/<int:task_id>/tags", methods=["POST"])
@jwt_required()
def add_tag_to_task(task_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    data = request.get_json()
    tag_name = data.get("tag_name", "").strip()
    tag_id = data.get("tag_id")

    if not tag_name and not tag_id:
        return jsonify({"message": "Either tag_name or tag_id is required"}), 400

    tag_to_add = None
    if tag_id is not None:  # Check if tag_id is provided
        if not isinstance(tag_id, int):
            return jsonify({"message": "Invalid tag_id format, must be an integer."}), 400
        tag_to_add = Tag.query.get(tag_id)
        if not tag_to_add:
            return jsonify({"message": f"Tag with id {tag_id} not found"}), 404
    elif tag_name:
        tag_to_add = Tag.query.filter(
            db.func.lower(Tag.name) == tag_name.lower()
        ).first()
        if not tag_to_add:
            # Create the tag if it doesn't exist
            tag_to_add = Tag(name=tag_name)
            db.session.add(tag_to_add)
            # Committing here to get the ID if it's a new tag,
            # though it could be part of the final commit.
            # Handling IntegrityError in case of race condition for tag creation.
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                tag_to_add = Tag.query.filter(
                    db.func.lower(Tag.name) == tag_name.lower()
                ).first()
                if not tag_to_add:  # Should not happen if previous logic is correct
                    return jsonify({"message": "Error creating or finding tag."}), 500

    if tag_to_add in task.tags:
        return (
            jsonify(
                {
                    "message": "Task already has this tag",
                    "task": task.to_dict(include_subtasks=True, include_tags=True),
                }
            ),
            200,
        )  # Or 409

    task.tags.append(tag_to_add)
    db.session.commit()

    user = User.query.get(current_user_id_int)  # Use int
    record_activity(
        action_type="TAG_ADDED_TO_TASK",
        description=(
            f"User '{user.username}' added tag '{tag_to_add.name}' "
            f"to task '{task.content[:30]}...'"
        ),
        user_id=current_user_id_int,  # Use int
        project_id=task.stage.project.id,
        task_id=task.id,
    )
    return jsonify(task.to_dict(include_subtasks=True, include_tags=True)), 200


@api_bp.route("/tasks/<int:task_id>/tags/<int:tag_id>", methods=["DELETE"])
@jwt_required()
def remove_tag_from_task(task_id, tag_id):
    current_user_id = get_jwt_identity()
    current_user_id_int = int(current_user_id)  # Added int conversion
    task = Task.query.get(task_id)

    if not task:
        return jsonify({"message": "Task not found"}), 404
    if task.stage.project.user_id != current_user_id_int:  # Use int
        return jsonify({"message": "Access forbidden to this task"}), 403

    tag_to_remove = Tag.query.get(tag_id)
    if not tag_to_remove:
        return jsonify({"message": f"Tag with id {tag_id} not found"}), 404

    if tag_to_remove not in task.tags:
        return (
            jsonify({"message": "Tag not found on this task"}),
            404,
        )  # Or 204 if we consider it idempotent

    task.tags.remove(tag_to_remove)
    db.session.commit()

    user = User.query.get(current_user_id_int)  # Use int
    record_activity(
        action_type="TAG_REMOVED_FROM_TASK",
        description=(
            f"User '{user.username}' removed tag '{tag_to_remove.name}' "
            f"from task '{task.content[:30]}...'"
        ),
        user_id=current_user_id_int,  # Use int
        project_id=task.stage.project.id,
        task_id=task.id,
    )
    return "", 204
