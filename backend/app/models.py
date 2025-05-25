from datetime import datetime
from backend.app import db  # Corrected import path


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    projects = db.relationship("Project", backref="author", lazy="dynamic")
    comments = db.relationship("Comment", backref="commenter", lazy="dynamic")
    activity_logs = db.relationship(
        "ActivityLog", backref="user", lazy="dynamic")

    def set_password(self, password):
        from werkzeug.security import generate_password_hash

        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        from werkzeug.security import check_password_hash

        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    stages = db.relationship(
        "Stage", backref="project", lazy="dynamic", cascade="all, delete-orphan"
    )
    activity_logs = db.relationship(
        "ActivityLog", backref="project", lazy="dynamic", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Project {self.name}>"

    def to_dict(self, include_stages=False):
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_stages:
            data["stages"] = [
                stage.to_dict() for stage in self.stages.order_by(Stage.order).all()
            ]
        return data


class Stage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey(
        "project.id"), nullable=False)
    order = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    tasks = db.relationship(
        "Task", backref="stage", lazy="dynamic", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Stage {self.name}>"

    def to_dict(self, include_tasks=False):
        data = {
            "id": self.id,
            "name": self.name,
            "project_id": self.project_id,
            "order": self.order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_tasks:
            data["tasks"] = [
                task.to_dict() for task in self.tasks.order_by(Task.order).all()
            ]
        return data


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    stage_id = db.Column(db.Integer, db.ForeignKey("stage.id"), nullable=False)
    assignee = db.Column(db.String(80), nullable=True)
    order = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    due_date = db.Column(db.DateTime, nullable=True)
    priority = db.Column(db.String(50), nullable=True)
    subtasks = db.relationship(
        "SubTask", backref="parent_task", lazy="dynamic", cascade="all, delete-orphan"
    )
    comments = db.relationship(
        "Comment", backref="task", lazy="dynamic", cascade="all, delete-orphan"
    )
    activity_logs = db.relationship(
        "ActivityLog", backref="task", lazy="dynamic", cascade="all, delete-orphan"
    )
    tags = db.relationship(
        "Tag",
        secondary="task_tag",
        lazy="subquery",
        backref=db.backref("tasks", lazy="dynamic"),
    )

    def __repr__(self):
        return f"<Task {self.id}>"

    def to_dict(self, include_subtasks=False, include_tags=True):
        data = {
            "id": self.id,
            "content": self.content,
            "stage_id": self.stage_id,
            "assignee": self.assignee,
            "order": self.order,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "tags": [tag.to_dict() for tag in self.tags] if include_tags else [],
        }
        if include_subtasks:
            subtasks_query = self.subtasks.order_by(SubTask.order).all()
            data["subtasks"] = [
                subtask.to_dict() for subtask in subtasks_query
            ]
        return data


class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    def __repr__(self):
        return f"<Tag {self.name}>"

    def to_dict(self):
        return {"id": self.id, "name": self.name}


# Association table for Task and Tag many-to-many relationship
task_tag = db.Table(
    "task_tag",
    db.Column("task_id", db.Integer, db.ForeignKey(
        "task.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tag.id"), primary_key=True),
)


class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    action_type = db.Column(
        db.String(100), nullable=False
    )  # e.g., "TASK_CREATED", "COMMENT_ADDED"
    description = db.Column(
        db.Text, nullable=False
    )  # e.g., "User 'X' created task 'Y'"
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    project_id = db.Column(
        db.Integer, db.ForeignKey("project.id"), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ActivityLog {self.action_type} by User {self.user_id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "action_type": self.action_type,
            "description": self.description,
            "user_id": self.user_id,
            "user_username": (
                self.user.username if self.user else None
            ),  # Include username
            "project_id": self.project_id,
            "task_id": self.task_id,
            "created_at": self.created_at.isoformat(),
        }


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<Comment {self.id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "task_id": self.task_id,
            "user_id": self.user_id,
            "commenter_username": (
                self.commenter.username if self.commenter else "Unknown"
            ),
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),  # Added None check for safety
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            ),  # Added None check for safety
        }


class SubTask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    parent_task_id = db.Column(
        db.Integer, db.ForeignKey("task.id"), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<SubTask {self.id}>"

    def to_dict(self):
        return {
            "id": self.id,
            "content": self.content,
            "parent_task_id": self.parent_task_id,
            "completed": self.completed,
            "order": self.order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
