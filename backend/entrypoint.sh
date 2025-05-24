#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure PYTHONPATH is set correctly if needed, assuming /app/backend is the root of our app
# and /app is the parent, so backend.app can be found.
export PYTHONPATH=/app

echo "Running database migrations..."
# Need to be in the backend directory for flask commands to pick up .flaskenv
# The WORKDIR in Dockerfile is /app/backend, so these commands run in the correct context.
flask db upgrade

echo "Starting Gunicorn..."
# exec "$@" allows us to pass the CMD from Dockerfile as arguments to this script
# Example: exec gunicorn --bind 0.0.0.0:5000 run:app
exec "$@"
