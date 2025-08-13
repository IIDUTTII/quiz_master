from flask_caching import Cache
from routes.config import Config

def init_cache(app):
    """Initialize cache with the Flask app"""
    cache = Cache()
    app.config.from_object(Config)
    cache.init_app(app)
    return cache

# Cache key patterns
CACHE_KEYS = {
    'user_dashboard': 'user_dashboard_{user_id}',
    'admin_dashboard': 'admin_dashboard',
    'quiz_stats': 'quiz_stats_{quiz_id}',
    'user_scores': 'user_scores_{user_id}',
    'quiz_questions': 'quiz_questions_{quiz_id}',
    'subjects_list': 'subjects_list',
    'recent_activity': 'recent_activity',
}

# Cache timeouts (in seconds)
CACHE_TIMEOUTS = {
    'dashboard': 300,        # 5 minutes
    'quiz_data': 1800,       # 30 minutes
    'user_scores': 600,      # 10 minutes
    'subjects': 3600,        # 1 hour
    'reports': 7200,         # 2 hours
}
