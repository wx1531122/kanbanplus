# Backend API Documentation

This document provides details on the available API endpoints for the Task Management Backend.

**Base URL:** `/api`

**Authentication:** Most endpoints require JWT authentication. Include the token in the `Authorization` header: `Bearer <your_access_token>`.

---

## Table of Contents
- [Authentication](#authentication-endpoints)
- [Projects](#project-endpoints)
- [Stages](#stage-endpoints)
- [Tasks](#task-endpoints)
- [SubTasks](#subtask-endpoints)
- [Comments](#comment-endpoints)
- [Tags](#tag-endpoints)
- [Activity Logs](#activity-log-endpoints)

---

## Authentication Endpoints

### `POST /api/auth/register`
Register a new user.
- **Request Body:**
  ```json
  {
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Responses:**
  - `201 Created`: User registered successfully.
    ```json
    {
      "message": "User registered successfully"
    }
    ```
  - `400 Bad Request`: Missing fields or invalid data.
  - `409 Conflict`: Username or email already exists.

### `POST /api/auth/login`
Log in an existing user.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Responses:**
  - `200 OK`: Login successful.
    ```json
    {
      "access_token": "your_jwt_access_token"
    }
    ```
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials.

### `POST /api/auth/logout`
Logout a user. (Stateless: informs client to discard token).
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Logout successful.
    ```json
    {
      "message": "Logout successful. Please discard the token client-side."
    }
    ```
  - `401 Unauthorized`: Token is missing or invalid.

### `GET /api/protected` (Test Route)
Example protected route.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns current user info.
    ```json
    {
      "logged_in_as": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "created_at": "...",
        "updated_at": "..."
      }
    }
    ```
  - `401 Unauthorized`: Token is missing or invalid.

---

## Project Endpoints

### `POST /api/projects`
Create a new project.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "My New Project",
    "description": "Optional project description."
  }
  ```
- **Responses:**
  - `201 Created`: Project created successfully. Returns project object.
    ```json
    {
      "id": 1,
      "name": "My New Project",
      "description": "Optional project description.",
      "user_id": 1,
      "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff",
      "updated_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
    }
    ```
  - `400 Bad Request`: Project name is required.
  - `401 Unauthorized`.

### `GET /api/projects`
Get all projects for the authenticated user.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns a list of project objects.
    ```json
    [
      {
        "id": 1,
        "name": "My New Project",
        "description": "Optional project description.",
        "user_id": 1,
        "created_at": "...",
        "updated_at": "..."
      }
    ]
    ```
  - `401 Unauthorized`.

### `GET /api/projects/<int:project_id>`
Get a specific project by ID. Includes stages by default.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns the project object with stages.
    ```json
    {
      "id": 1,
      "name": "My New Project",
      "description": "Optional project description.",
      "user_id": 1,
      "created_at": "...",
      "updated_at": "...",
      "stages": [
        {
          "id": 1,
          "name": "To Do",
          "project_id": 1,
          "order": 0,
          "created_at": "...",
          "updated_at": "...",
          "tasks": [ /* tasks included if stage.to_dict includes them */ ]
        }
      ]
    }
    ```
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not own the project.
  - `404 Not Found`: Project not found.

### `PUT /api/projects/<int:project_id>`
Update an existing project.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "Updated Project Name",
    "description": "Updated description."
  }
  ```
- **Responses:**
  - `200 OK`: Project updated successfully. Returns updated project object.
  - `400 Bad Request`: No input data.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `DELETE /api/projects/<int:project_id>`
Delete a project.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `204 No Content`: Project deleted successfully.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

---

## Stage Endpoints

### `POST /api/projects/<int:project_id>/stages`
Create a new stage within a project.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "New Stage Name",
    "order": 1 
  }
  ```
- **Responses:**
  - `201 Created`: Stage created. Returns stage object.
  - `400 Bad Request`: Stage name required.
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not own the project.
  - `404 Not Found`: Project not found.

### `GET /api/projects/<int:project_id>/stages`
Get all stages for a specific project.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: List of stage objects.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `PUT /api/stages/<int:stage_id>`
Update an existing stage.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "Updated Stage Name",
    "order": 0
  }
  ```
- **Responses:**
  - `200 OK`: Stage updated. Returns stage object.
  - `400 Bad Request`.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `DELETE /api/stages/<int:stage_id>`
Delete a stage.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `204 No Content`: Stage deleted.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

---

## Task Endpoints

### `POST /api/stages/<int:stage_id>/tasks`
Create a new task within a stage.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "content": "My new task content",
    "assignee": "user@example.com",
    "due_date": "YYYY-MM-DDTHH:MM:SS", // Optional
    "priority": "High", // Optional
    "order": 0 // Optional
  }
  ```
- **Responses:**
  - `201 Created`: Task created. Returns task object (includes tags array).
  - `400 Bad Request`: Task content required or invalid date format.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`: Stage not found.

### `GET /api/stages/<int:stage_id>/tasks`
Get all tasks for a specific stage.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: List of task objects (each includes tags array).
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `GET /api/tasks/<int:task_id>`
Get a specific task by ID. Includes subtasks and tags.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns the task object.
    ```json
    {
      "id": 1,
      "content": "Task content",
      "stage_id": 1,
      "assignee": "user@example.com",
      "order": 0,
      "due_date": "...",
      "priority": "High",
      "created_at": "...",
      "updated_at": "...",
      "subtasks": [ /* list of subtask objects */ ],
      "tags": [ /* list of tag objects */ 
        { "id": 1, "name": "Urgent" }
      ] 
    }
    ```
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `PUT /api/tasks/<int:task_id>`
Update an existing task. Can be used to move task to a new stage.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body (example fields, all optional):**
  ```json
  {
    "content": "Updated task content",
    "assignee": "new_user@example.com",
    "due_date": null, // Clears due date
    "priority": "Low",
    "order": 1,
    "stage_id": 2 // Moves task to stage with ID 2
  }
  ```
- **Responses:**
  - `200 OK`: Task updated. Returns updated task object (includes tags).
  - `400 Bad Request`.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found` (Task or new Stage).

### `DELETE /api/tasks/<int:task_id>`
Delete a task.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `204 No Content`: Task deleted.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

---

## SubTask Endpoints

### `POST /api/tasks/<int:task_id>/subtasks`
Create a new subtask for a parent task.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "content": "Subtask content",
    "completed": false, // Optional, default false
    "order": 0 // Optional
  }
  ```
- **Responses:**
  - `201 Created`: Subtask created. Returns subtask object.
  - `400 Bad Request`.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found` (Parent task).

### `GET /api/tasks/<int:task_id>/subtasks`
Get all subtasks for a parent task.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: List of subtask objects.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `PUT /api/subtasks/<int:subtask_id>`
Update an existing subtask.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "content": "Updated subtask content",
    "completed": true,
    "order": 1
  }
  ```
- **Responses:**
  - `200 OK`: Subtask updated. Returns subtask object.
  - `400 Bad Request`.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

### `DELETE /api/subtasks/<int:subtask_id>`
Delete a subtask.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `204 No Content`: Subtask deleted.
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`.

---

## Comment Endpoints

### `POST /api/tasks/<int:task_id>/comments`
Create a new comment on a task.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "content": "This is my insightful comment."
  }
  ```
- **Responses:**
  - `201 Created`: Comment created successfully. Returns comment object.
    ```json
    {
      "id": 1,
      "content": "This is my insightful comment.",
      "task_id": 1,
      "user_id": 1,
      "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff",
      "updated_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
    }
    ```
  - `400 Bad Request`: Comment content is required.
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not have access to the task.
  - `404 Not Found`: Task not found.

### `GET /api/tasks/<int:task_id>/comments`
Get all comments for a specific task, ordered by creation date (ascending).
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns a list of comment objects.
    ```json
    [
      {
        "id": 1,
        "content": "First comment.",
        "task_id": 1,
        "user_id": 1,
        "created_at": "...",
        "updated_at": "..."
      },
      {
        "id": 2,
        "content": "Second comment.",
        "task_id": 1,
        "user_id": 2,
        "created_at": "...",
        "updated_at": "..."
      }
    ]
    ```
  - `401 Unauthorized`.
  - `403 Forbidden`.
  - `404 Not Found`: Task not found.

---

## Tag Endpoints

### `POST /api/tags`
Create a new tag or return an existing one if name matches (case-insensitive).
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "name": "MyNewTag" 
  }
  ```
- **Responses:**
  - `201 Created`: Tag created. Returns tag object.
    ```json
    { "id": 1, "name": "MyNewTag" }
    ```
  - `200 OK`: Tag with this name already exists. Returns existing tag object.
    ```json
    { "id": 1, "name": "MyNewTag" } 
    ```
  - `400 Bad Request`: Tag name is required.
  - `401 Unauthorized`.

### `GET /api/tags`
Get all available tags, ordered by name.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns a list of tag objects.
    ```json
    [
      { "id": 2, "name": "Backend" },
      { "id": 1, "name": "Urgent" }
    ]
    ```
  - `401 Unauthorized`.

### `POST /api/tasks/<int:task_id>/tags`
Add a tag to a task. The tag can be specified by `tag_id` or `tag_name`. If `tag_name` is provided and the tag doesn't exist, it will be created.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body (Option 1: by `tag_id`):**
  ```json
  { "tag_id": 1 }
  ```
- **Request Body (Option 2: by `tag_name`):**
  ```json
  { "tag_name": "Feature" }
  ```
- **Responses:**
  - `200 OK`: Tag added to task (or was already present). Returns updated task object (including its full list of tags).
    ```json
    // Full Task Object as in GET /api/tasks/<task_id>
    {
      "id": 1,
      "content": "Task content",
      // ... other task fields ...
      "tags": [
        { "id": 1, "name": "Urgent" },
        { "id": 2, "name": "Feature" }
      ]
    }
    ```
  - `400 Bad Request`: `tag_id` or `tag_name` is required.
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not have access to the task.
  - `404 Not Found`: Task not found, or `tag_id` provided but tag not found.

### `DELETE /api/tasks/<int:task_id>/tags/<int:tag_id>`
Remove a tag from a task.
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `204 No Content`: Tag removed successfully from the task.
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not have access to the task.
  - `404 Not Found`: Task not found, tag not found, or tag not associated with this task.

---

## Activity Log Endpoints

### `GET /api/projects/<int:project_id>/activities`
Get all activity logs for a specific project, ordered by creation date (descending).
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns a list of activity log objects.
    ```json
    [
      {
        "id": 1,
        "action_type": "TASK_CREATED",
        "description": "User 'testuser' created task 'Setup a new database'",
        "user_id": 1,
        "user_username": "testuser",
        "project_id": 1,
        "task_id": 1,
        "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
      },
      {
        "id": 2,
        "action_type": "PROJECT_CREATED",
        "description": "User 'testuser' created project 'New Website'",
        "user_id": 1,
        "user_username": "testuser",
        "project_id": 1,
        "task_id": null,
        "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
      }
    ]
    ```
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not have access to the project.
  - `404 Not Found`: Project not found.

### `GET /api/tasks/<int:task_id>/activities`
Get all activity logs for a specific task, ordered by creation date (descending).
- **Headers:** `Authorization: Bearer <access_token>`
- **Responses:**
  - `200 OK`: Returns a list of activity log objects related to the task.
    ```json
     [
      {
        "id": 3,
        "action_type": "COMMENT_ADDED",
        "description": "User 'testuser' commented on task 'Setup a new database'",
        "user_id": 1,
        "user_username": "testuser",
        "project_id": 1,
        "task_id": 1,
        "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
      },
      {
        "id": 1,
        "action_type": "TASK_CREATED",
        "description": "User 'testuser' created task 'Setup a new database'",
        "user_id": 1,
        "user_username": "testuser",
        "project_id": 1,
        "task_id": 1,
        "created_at": "YYYY-MM-DDTHH:MM:SS.ffffff"
      }
    ]
    ```
  - `401 Unauthorized`.
  - `403 Forbidden`: User does not have access to the task.
  - `404 Not Found`: Task not found.

---
