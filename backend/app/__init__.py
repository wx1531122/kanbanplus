from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from backend.config import config  # Moved import to top

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    migrate.init_app(app, db)

    from flask_jwt_extended import JWTManager

    JWTManager(app)  # Initialize JWTManager, assign to unused 'jwt' removed

    # Removed 'from . import models' as it was unused

    # Register Blueprints
    from .auth.routes import auth_bp

    app.register_blueprint(auth_bp)

    from .api.routes import api_bp

    app.register_blueprint(api_bp)

    return app
