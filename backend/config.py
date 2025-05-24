import os

import secrets

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_very_secret_key'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///../instance/dev.db'

class TestingConfig(Config):
    TESTING = True
    # Use in-memory SQLite for tests by default if TEST_DATABASE_URL is not set
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False # Disable CSRF for testing forms if any; not strictly needed for API tests

class ProductionConfig(Config):
    DEBUG = False
    # SQLALCHEMY_DATABASE_URI for production will be relative to the WORKDIR /app/backend
    # So, 'sqlite:///instance/prod.db' means /app/backend/instance/prod.db
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///instance/prod.db'

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
