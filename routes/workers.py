import os
import sys
from celery import Celery
from flask import Flask

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

def make_celery(flask_app=None):
    """Create Celery instance with Flask app context"""
    celery = Celery('quiz_app')
    
    # Redis configuration
    celery.conf.update(
        broker_url='redis://localhost:6379/0',
        result_backend='redis://localhost:6379/0',
        accept_content=['json'],
        task_serializer='json',
        result_serializer='json',
        timezone='Asia/Kolkata',
        enable_utc=True,
        include=['routes.tasks'],
    )
    
    # ALWAYS create context-aware tasks (even without flask_app)
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            if flask_app:
                with flask_app.app_context():
                    return self.run(*args, **kwargs)
            else:
                # Import get_flask_app here to avoid circular imports
                from routes.tasks import get_flask_app
                app = get_flask_app()
                with app.app_context():
                    return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

# Create Celery instance (will be updated when Flask app is available)
celery = make_celery()

print(f"Celery broker URL: {celery.conf.broker_url}")
print(f"Celery result backend: {celery.conf.result_backend}")

if __name__ == '__main__':
    celery.start()
