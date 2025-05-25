# Enhanced Kanban Collaboration Platform

## Overview

The Enhanced Kanban Collaboration Platform is a full-stack web application designed to help users and teams manage projects and tasks using a visual Kanban board interface. It supports real-time collaboration features, task organization, and progress tracking. This platform is built with a modern tech stack, focusing on usability and developer-friendliness.

## Features

*   **User Authentication:** Secure registration and login for users.
*   **Project Management:** Create, view, update, and delete projects.
*   **Stage Management:** Organize tasks within projects using customizable stages (e.g., To Do, In Progress, Done). Includes drag-and-drop reordering of stages.
*   **Task Management:** Create, update, delete, and manage tasks within stages. Tasks include details like content, assignee, priority, and due dates.
*   **Sub-Task Management:** Break down tasks into smaller, manageable sub-tasks with completion status.
*   **Task Comments:** Add comments to tasks for discussion and clarification.
*   **Task Tagging:** Assign tags to tasks for better categorization and filtering (e.g., "bug", "feature", "urgent").
*   **Drag-and-Drop Interface:**
    *   Reorder tasks within and between stages.
    *   Reorder stages within a project.
*   **Activity Log:** Track key activities within a project (e.g., task creation, movement, comments).
*   **Responsive UI:** The application is designed to be usable across different screen sizes.

## Tech Stack

*   **Frontend:**
    *   React (with Vite for build tooling)
    *   JavaScript
    *   React Router for client-side routing
    *   Axios for API communication
    *   `@hello-pangea/dnd` for drag-and-drop functionality
    *   Nginx (for serving static assets and as a reverse proxy in Docker)
*   **Backend:**
    *   Flask (Python web framework)
    *   SQLAlchemy (ORM for database interaction)
    *   Flask-Migrate (for database schema migrations)
    *   Flask-JWT-Extended (for JWT authentication)
    *   Gunicorn (WSGI server in Docker)
*   **Database:**
    *   SQLite (for simplicity and ease of setup)
*   **Development & CI/CD:**
    *   Docker & Docker Compose
    *   GitHub Actions for CI (linting, testing, Docker builds, optional publishing to GHCR)
    *   ESLint & Prettier (for code linting and formatting)
    *   Pytest & Vitest (for backend and frontend testing)

## Prerequisites

To run this application locally, you will need:

*   Docker Engine (latest version recommended)
*   Docker Compose (usually included with Docker Desktop)
*   Git (for cloning the repository)
*   A web browser (e.g., Chrome, Firefox, Edge, Safari)

## Getting Started / Setup and Running the Application

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd <project_folder_name> # e.g., cd enhanced-kanban-platform
    ```

2.  **Environment Variables:**
    *   **Backend:**
        *   Navigate to the `backend` directory: `cd backend`
        *   Create a production environment file by copying the example (if provided) or creating a new one:
            *   If `backend/.env.example` exists: `cp .env.example .env.prod`
            *   Otherwise, create a new file named `.env.prod`.
        *   Edit `backend/.env.prod` and set the following variables with strong, unique values:
            ```env
            FLASK_APP=run.py
            FLASK_ENV=production
            FLASK_CONFIG=production
            DATABASE_URL=sqlite:///instance/prod.db # Default, path inside Docker container
            JWT_SECRET_KEY=your_very_strong_jwt_secret_key_here_CHANGE_THIS
            SECRET_KEY=your_very_strong_flask_secret_key_here_CHANGE_THIS
            ```
            **Important:** Replace placeholder values for `JWT_SECRET_KEY` and `SECRET_KEY` with secure, randomly generated strings.
        *   Return to the project root directory: `cd ..`
    *   **Frontend:**
        *   The `frontend/.env.production` file (containing `VITE_API_BASE_URL=/api`) is used at build time and is already configured correctly for use with the Nginx proxy in Docker. No changes are typically needed here for local Docker Compose setup.

3.  **Build and Run with Docker Compose:**
    From the project root directory (where `docker-compose.yml` is located):
    ```bash
    docker-compose up --build -d
    ```
    *   `--build`: Forces Docker to rebuild the images if they don't exist or if Dockerfiles/contexts have changed.
    *   `-d`: Runs the containers in detached mode (in the background).

4.  **Accessing the Application:**
    *   **Frontend:** Open your web browser and navigate to `http://localhost:3000`
    *   **Backend API (Direct):** The backend API will be available at `http://localhost:5000`. However, the frontend is configured to proxy API requests starting with `/api` through its Nginx server (at `http://localhost:3000/api/...`) to the backend. Direct access to `localhost:5000` might be useful for tools like Postman if needed.

## Stopping the Application

To stop the running application and remove the containers:

```bash
docker-compose down
```
If you also want to remove the named volume (which stores the database data):
```bash
docker-compose down -v
```

## Project Structure

```
.
├── .github/workflows/      # GitHub Actions CI/CD workflows
│   ├── backend-ci.yml
│   └── frontend-ci.yml
├── backend/                # Backend Flask application
│   ├── app/                # Core application logic, models, routes
│   ├── migrations/         # Database migration scripts
│   ├── services/           # Business logic services (e.g., activity_service.py)
│   ├── tests/              # Backend tests
│   ├── .dockerignore
│   ├── .env.prod           # Production environment variables (create this)
│   ├── .flaskenv           # Development Flask settings
│   ├── API_DOCUMENTATION.md # API documentation
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/               # Frontend React application
│   ├── public/
│   ├── src/                # Source files (components, pages, services, contexts)
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── tests/          # Frontend tests
│   ├── .dockerignore
│   ├── .env.development    # Vite env for development
│   ├── .env.production     # Vite env for production build (VITE_API_BASE_URL=/api)
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf          # Nginx configuration for frontend Docker image
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml      # Docker Compose file for multi-container setup
├── PRODUCT_REQUIREMENTS.md # Original Product Requirements Document
└── README.md               # This file: Main project README
```

## CI/CD

This project uses GitHub Actions for Continuous Integration (CI). Workflows are defined in `.github/workflows/` for both the backend and frontend. These workflows automatically:
*   Install dependencies.
*   Run linters (Flake8 for backend, ESLint for frontend).
*   Run format checkers (Black for backend and frontend).
*   Execute automated tests (Pytest for backend, Vitest for frontend), including coverage generation.
*   Build Docker images to ensure they are valid.
*   Optionally, on pushes to the `main` branch, publish Docker images to GitHub Container Registry (GHCR).

## Contributing

(Optional: Add guidelines for contributing if this were an open project, e.g., branching strategy, code style, submitting pull requests.)

## License

(Optional: Specify a license, e.g., MIT License.)
This project is currently not under a specific open-source license.
