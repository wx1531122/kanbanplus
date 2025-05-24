from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.models import User, Project, Stage, Task, SubTask # Import all models
from backend.app import db # Import db
from datetime import datetime # For due_date parsing

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API is up and running!'}), 200

# Test/Protected Route (can be removed or kept for testing)
@api_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if user:
        return jsonify(logged_in_as=user.to_dict()), 200
    return jsonify(message="User not found"), 404


# === Project Endpoints ===

@api_bp.route('/projects', methods=['POST'])
@jwt_required()
def create_project():
    current_user_id = get_jwt_identity()
    data = request.get_json()

    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({'message': 'Project name is required'}), 400

    name = data['name'].strip()
    description = data.get('description', '').strip()

    project = Project(name=name, description=description, user_id=current_user_id)
    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201

@api_bp.route('/projects', methods=['GET'])
@jwt_required()
def get_projects():
    current_user_id = get_jwt_identity()
    projects = Project.query.filter_by(user_id=current_user_id).order_by(Project.created_at.desc()).all()
    return jsonify([project.to_dict() for project in projects]), 200

@api_bp.route('/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    current_user_id = get_jwt_identity()
    project = Project.query.get(project_id)

    if not project:
        return jsonify({'message': 'Project not found'}), 404
    if project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden'}), 403
    
    # Optionally include stages and tasks by default if useful
    return jsonify(project.to_dict(include_stages=True)), 200

@api_bp.route('/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    current_user_id = get_jwt_identity()
    project = Project.query.get(project_id)

    if not project:
        return jsonify({'message': 'Project not found'}), 404
    if project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    updated = False
    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
        updated = True
    if 'description' in data: # Allow empty description
        project.description = data['description'].strip()
        updated = True
    
    if updated:
        db.session.commit()
    return jsonify(project.to_dict()), 200

@api_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    current_user_id = get_jwt_identity()
    project = Project.query.get(project_id)

    if not project:
        return jsonify({'message': 'Project not found'}), 404
    if project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden'}), 403

    db.session.delete(project)
    db.session.commit()
    return '', 204


# === Stage Endpoints ===

@api_bp.route('/projects/<int:project_id>/stages', methods=['POST'])
@jwt_required()
def create_stage(project_id):
    current_user_id = get_jwt_identity()
    project = Project.query.get(project_id)

    if not project:
        return jsonify({'message': 'Project not found'}), 404
    if project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this project'}), 403

    data = request.get_json()
    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({'message': 'Stage name is required'}), 400

    name = data['name'].strip()
    order = data.get('order') # Can be None

    stage = Stage(name=name, project_id=project.id, order=order)
    db.session.add(stage)
    db.session.commit()
    return jsonify(stage.to_dict()), 201

@api_bp.route('/projects/<int:project_id>/stages', methods=['GET'])
@jwt_required()
def get_stages_for_project(project_id):
    current_user_id = get_jwt_identity()
    project = Project.query.get(project_id)

    if not project:
        return jsonify({'message': 'Project not found'}), 404
    if project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this project'}), 403

    stages = Stage.query.filter_by(project_id=project.id).order_by(Stage.order, Stage.created_at).all()
    return jsonify([stage.to_dict() for stage in stages]), 200

@api_bp.route('/stages/<int:stage_id>', methods=['PUT'])
@jwt_required()
def update_stage(stage_id):
    current_user_id = get_jwt_identity()
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({'message': 'Stage not found'}), 404
    if stage.project.user_id != current_user_id: # Check ownership via project
        return jsonify({'message': 'Access forbidden to this stage'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    updated = False
    if 'name' in data and data['name'].strip():
        stage.name = data['name'].strip()
        updated = True
    if 'order' in data: # order can be 0, so check for presence
        stage.order = data['order']
        updated = True
    # For V1, not allowing moving stage to another project via this endpoint.
    # If 'project_id' were allowed, further checks for the new project's ownership would be needed.

    if updated:
        db.session.commit()
    return jsonify(stage.to_dict()), 200

@api_bp.route('/stages/<int:stage_id>', methods=['DELETE'])
@jwt_required()
def delete_stage(stage_id):
    current_user_id = get_jwt_identity()
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({'message': 'Stage not found'}), 404
    if stage.project.user_id != current_user_id: # Check ownership via project
        return jsonify({'message': 'Access forbidden to this stage'}), 403

    db.session.delete(stage)
    db.session.commit()
    return '', 204


# === Task Endpoints ===

@api_bp.route('/stages/<int:stage_id>/tasks', methods=['POST'])
@jwt_required()
def create_task(stage_id):
    current_user_id = get_jwt_identity()
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({'message': 'Stage not found'}), 404
    if stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this stage'}), 403

    data = request.get_json()
    if not data or 'content' not in data or not data['content'].strip():
        return jsonify({'message': 'Task content is required'}), 400

    content = data['content'].strip()
    assignee = data.get('assignee', '').strip()
    priority = data.get('priority', '').strip()
    order = data.get('order') # Can be None

    due_date_str = data.get('due_date')
    due_date_obj = None
    if due_date_str:
        try:
            due_date_obj = datetime.fromisoformat(due_date_str)
        except ValueError:
            return jsonify({'message': 'Invalid due_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or (YYYY-MM-DD).'}), 400

    task = Task(
        content=content, 
        stage_id=stage.id, 
        assignee=assignee, 
        due_date=due_date_obj, 
        priority=priority, 
        order=order
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201

@api_bp.route('/stages/<int:stage_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks_for_stage(stage_id):
    current_user_id = get_jwt_identity()
    stage = Stage.query.get(stage_id)

    if not stage:
        return jsonify({'message': 'Stage not found'}), 404
    if stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this stage'}), 403

    tasks = Task.query.filter_by(stage_id=stage.id).order_by(Task.order, Task.created_at).all()
    return jsonify([task.to_dict() for task in tasks]), 200

@api_bp.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.get(task_id)

    if not task:
        return jsonify({'message': 'Task not found'}), 404
    if task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this task'}), 403
    
    return jsonify(task.to_dict(include_subtasks=True)), 200


@api_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.get(task_id)

    if not task:
        return jsonify({'message': 'Task not found'}), 404
    if task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this task'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    updated = False
    if 'content' in data and data['content'].strip():
        task.content = data['content'].strip()
        updated = True
    if 'assignee' in data:
        task.assignee = data['assignee'].strip()
        updated = True
    if 'priority' in data:
        task.priority = data['priority'].strip()
        updated = True
    if 'order' in data:
        task.order = data['order']
        updated = True
    if 'due_date' in data:
        due_date_str = data.get('due_date')
        if due_date_str:
            try:
                task.due_date = datetime.fromisoformat(due_date_str)
            except ValueError:
                return jsonify({'message': 'Invalid due_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or (YYYY-MM-DD).'}), 400
        else: # Allow clearing due_date
            task.due_date = None
        updated = True
    
    if 'stage_id' in data:
        new_stage_id = data['stage_id']
        if new_stage_id != task.stage_id:
            new_stage = Stage.query.get(new_stage_id)
            if not new_stage:
                return jsonify({'message': 'New stage not found'}), 404
            if new_stage.project.user_id != current_user_id:
                return jsonify({'message': 'Access forbidden to new stage'}), 403
            task.stage_id = new_stage_id
            updated = True

    if updated:
        db.session.commit()
    return jsonify(task.to_dict()), 200

@api_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.get(task_id)

    if not task:
        return jsonify({'message': 'Task not found'}), 404
    if task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this task'}), 403

    db.session.delete(task)
    db.session.commit()
    return '', 204


# === SubTask Endpoints ===

@api_bp.route('/tasks/<int:task_id>/subtasks', methods=['POST'])
@jwt_required()
def create_subtask(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.get(task_id)

    if not task:
        return jsonify({'message': 'Parent task not found'}), 404
    if task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to parent task'}), 403

    data = request.get_json()
    if not data or 'content' not in data or not data['content'].strip():
        return jsonify({'message': 'SubTask content is required'}), 400

    content = data['content'].strip()
    completed = data.get('completed', False)
    order = data.get('order') # Can be None

    if not isinstance(completed, bool):
        return jsonify({'message': 'Invalid format for completed flag, must be boolean.'}), 400

    subtask = SubTask(
        content=content,
        parent_task_id=task.id,
        completed=completed,
        order=order
    )
    db.session.add(subtask)
    db.session.commit()
    return jsonify(subtask.to_dict()), 201

@api_bp.route('/tasks/<int:task_id>/subtasks', methods=['GET'])
@jwt_required()
def get_subtasks_for_task(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.get(task_id)

    if not task:
        return jsonify({'message': 'Parent task not found'}), 404
    if task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to parent task'}), 403

    subtasks = SubTask.query.filter_by(parent_task_id=task.id).order_by(SubTask.order, SubTask.created_at).all()
    return jsonify([subtask.to_dict() for subtask in subtasks]), 200

@api_bp.route('/subtasks/<int:subtask_id>', methods=['PUT'])
@jwt_required()
def update_subtask(subtask_id):
    current_user_id = get_jwt_identity()
    subtask = SubTask.query.get(subtask_id)

    if not subtask:
        return jsonify({'message': 'SubTask not found'}), 404
    if subtask.parent_task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this subtask'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    updated = False
    if 'content' in data and data['content'].strip():
        subtask.content = data['content'].strip()
        updated = True
    if 'completed' in data:
        completed_val = data['completed']
        if not isinstance(completed_val, bool):
            return jsonify({'message': 'Invalid format for completed flag, must be boolean.'}), 400
        subtask.completed = completed_val
        updated = True
    if 'order' in data:
        subtask.order = data['order']
        updated = True
    # For V1, not allowing moving subtask to another parent task via this endpoint.

    if updated:
        db.session.commit()
    return jsonify(subtask.to_dict()), 200

@api_bp.route('/subtasks/<int:subtask_id>', methods=['DELETE'])
@jwt_required()
def delete_subtask(subtask_id):
    current_user_id = get_jwt_identity()
    subtask = SubTask.query.get(subtask_id)

    if not subtask:
        return jsonify({'message': 'SubTask not found'}), 404
    if subtask.parent_task.stage.project.user_id != current_user_id:
        return jsonify({'message': 'Access forbidden to this subtask'}), 403

    db.session.delete(subtask)
    db.session.commit()
    return '', 204
