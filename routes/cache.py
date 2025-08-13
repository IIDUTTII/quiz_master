from datetime import datetime, timedelta
from flask_caching import Cache
from routes.config import Config


_cache = {}


def set_cache(key, value, ttl=300):
    _cache[key] = {'data': value, 'exp': datetime.now() + timedelta(seconds=ttl)}


def get_cache(key):
    obj = _cache.get(key)
    if obj and datetime.now() < obj['exp']:
        return obj['data']
    
    _cache.pop(key, None)
    return None


def clear_key(key):
    _cache.pop(key, None)


def clear_all():
    n = len(_cache)
    _cache.clear() 
    return n


def init_cache(app):
    cache = Cache()
    app.config.from_object(Config)
    cache.init_app(app) 
    return cache


CACHE_KEYS = {
    'user_dashboard': 'user_dashboard_{user_id}',
    'admin_dashboard': 'admin_dashboard', 
    'quiz_stats': 'quiz_stats_{quiz_id}',
    'user_scores': 'user_scores_{user_id}',
    'quiz_questions': 'quiz_questions_{quiz_id}',
    'subjects_list': 'subjects_list',
    'recent_activity': 'recent_activity',
}


CACHE_TIMEOUTS = {
    'dashboard': 300,
    'quiz_data': 1800, 
    'user_scores': 600,
    'subjects': 3600,
    'reports': 7200,
}
