# Base image
FROM python:3.10-slim

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=run.py
ENV FLASK_ENV=production
ENV FLASK_CONFIG=production
ENV PYTHONDONTWRITEBYTECODE=1 # Optional: Prevents .pyc files

# Set working directory
WORKDIR /app/backend

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
# --no-cache-dir: Disables the cache, which is not needed in Docker images.
# --user: Installs packages into the user site-packages directory. Not typically needed if running as root in container.
# For simplicity and common practice, will install system-wide in the container.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Set the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]

# Command to run the Gunicorn server (will be passed to entrypoint.sh)
# Make sure run:app is accessible.
# run.py should have `app = create_app(...)` at the global scope.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]
