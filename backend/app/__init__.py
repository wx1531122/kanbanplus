from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

from backend.config import config

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    migrate.init_app(app, db)

    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app) # Initialize JWTManager

    from . import models # Import models here

    # Register Blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp)

    from .api.routes import api_bp
    app.register_blueprint(api_bp)

    return app
