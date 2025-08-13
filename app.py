from flask import Flask, render_template, jsonify, abort
from routes.register import registerpy
from routes.admin.admin_page import adminpy
from routes.user.user import userpy
from models.models import db
from api import apipy
from flask_migrate import Migrate
import os
from flask import send_from_directory

from routes.config import Config
from routes.cache_config import init_cache
from routes.tasks import init_mail
from routes.workers import make_celery

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config.from_object(Config)
    app.instance_path = os.path.abspath('instance')
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.instance_path, 'test.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config["SECRET_KEY"] = "DFV#saG1AA2A@sAGSG"
    
    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # Initialize cache and mail
    cache = init_cache(app)
    mail = init_mail(app)
    
    # Initialize Celery WITH Flask app context (this is crucial!)
    celery = make_celery(app)  # Pass the Flask app here
    
    # Attach to app for later access
    app.cache = cache
    app.mail = mail
    app.celery = celery
    
    # Register blueprints
    app.register_blueprint(registerpy)
    app.register_blueprint(userpy)
    app.register_blueprint(adminpy)
    app.register_blueprint(apipy)
    
    return app

# Create the Flask app
app = create_app()

# Update the global celery instance with Flask context
# This ensures tasks can access Flask app context
from routes import workers
workers.celery = app.celery

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith('api/') or path.startswith('static/'):
        abort(404)
    return render_template('index.html')

@app.route('/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "database": "connected",
        "cache": "connected"
    })

@app.route('/test_celery')
def test_celery():
    """Test Celery connection"""
    try:
        if not hasattr(app, 'celery'):
            return jsonify({"error": "Celery not initialized in app"}), 500
        
        inspect = app.celery.control.inspect()
        stats = inspect.stats()
        
        return jsonify({
            "celery_available": stats is not None,
            "worker_stats": stats,
            "registered_tasks": list(app.celery.tasks.keys()) if hasattr(app.celery, 'tasks') else []
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

if __name__ == "__main__":
    app.run(debug=True)
