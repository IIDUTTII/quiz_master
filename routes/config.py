class Config:
    # basic redis config 
    REDIS_URL = 'redis://localhost:6379/0'
    
    # email for mailhog
    MAIL_SERVER = 'localhost'
    MAIL_PORT = 1025
    MAIL_USE_TLS = False
    MAIL_USE_SSL = False
    MAIL_DEFAULT_SENDER = 'quiz-app@localhost'
    
    # cache timeout
    CACHE_TIMEOUT = 300  # 5 minutes
    
    # flask cache config (needed for cache.py)
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
