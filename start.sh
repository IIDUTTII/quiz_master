#!/usr/bin/env bash
# cel.sh – start Redis, MailHog, Celery worker/beat, then the Flask app
set -euo pipefail
IFS=$'\n\t'

###############################################################################
# 0.  Paths & helpers
###############################################################################
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR"
MAILHOG_CONTAINER="mailhog-quiz"
MAILHOG_LOG="$PROJECT_DIR/mailhog.log"

info()  { printf "\e[1;34m%s\e[0m\n" "$*"; }  # blue
good()  { printf "\e[1;32m%s\e[0m\n" "$*"; }  # green
warn()  { printf "\e[1;33m%s\e[0m\n" "$*"; }  # yellow
fail()  { printf "\e[1;31m%s\e[0m\n" "$*"; exit 1; }

mailhog_running() {
  pgrep -Fi "[mM]ail[hH]og" >/dev/null 2>&1 \
  || docker ps --filter "name=${MAILHOG_CONTAINER}" --filter "status=running" --quiet | grep -q .
}

###############################################################################
# 1.  Project directory & venv
###############################################################################
info "🚀  Starting Quiz-App helper script from $(basename "$PROJECT_DIR") …"
cd "$PROJECT_DIR" || fail "Cannot cd to $PROJECT_DIR"

info "🐍  Activating virtual environment …"
if   [[ -f venv/bin/activate  ]]; then source venv/bin/activate
elif [[ -f .venv/bin/activate ]]; then source .venv/bin/activate
else fail "No virtual environment found (venv/ or .venv/)" ; fi

[[ -f app.py ]] || fail "app.py not found in $(pwd)"

###############################################################################
# 2.  Redis
###############################################################################
info "📦  Checking Redis …"
if ! redis-cli ping >/dev/null 2>&1; then
  info "🔄  Starting Redis …"
  redis-server --daemonize yes
  sleep 2
  redis-cli ping >/dev/null 2>&1 || fail "Redis failed to start"
fi
good "✅  Redis is running"

###############################################################################
# 3.  MailHog
###############################################################################
info "📧  Checking MailHog …"
if mailhog_running; then
  good "✅  MailHog is already running"
else
  info "🔄  Starting / restoring MailHog container …"
  # Try to start an existing container; create if absent
  if ! docker start "$MAILHOG_CONTAINER" >/dev/null 2>&1; then
    docker run -d --name "$MAILHOG_CONTAINER" \
      -p 1025:1025 -p 8025:8025 mailhog/mailhog \
      >/dev/null
  fi
  sleep 2
  mailhog_running && good "✅  MailHog is running (Docker)" \
                   || warn "⚠️  MailHog failed – emails will NOT be captured"
fi

###############################################################################
# 4.  Celery worker & beat
###############################################################################
info "🧹  Killing any old Celery processes …"
pkill -f 'celery.*worker' || true
pkill -f 'celery.*beat'   || true

info "📝  Preparing log files …"
: > celery_worker.log
: > celery_beat.log

info "⚙️   Starting Celery worker …"
celery -A routes.workers.celery worker --loglevel=info \
       > celery_worker.log 2>&1 &
WORKER_PID=$!

sleep 3
kill -0 "$WORKER_PID" 2>/dev/null \
  && good "✅  Celery worker PID $WORKER_PID" \
  || { tail -20 celery_worker.log; fail "Celery worker failed"; }

info "⏰  Starting Celery beat …"
celery -A routes.workers.celery beat --loglevel=info \
       > celery_beat.log 2>&1 &
BEAT_PID=$!

sleep 3
kill -0 "$BEAT_PID" 2>/dev/null \
  && good "✅  Celery beat PID $BEAT_PID" \
  || warn "⚠️  Celery beat failed (see celery_beat.log)"

###############################################################################
# 5.  Graceful shutdown
###############################################################################
cleanup() {
  echo
  info "🛑  Shutting down …"
  kill "$WORKER_PID" "$BEAT_PID" 2>/dev/null || true
  docker stop "$MAILHOG_CONTAINER" >/dev/null 2>&1 || true
  good "✅  Cleanup complete"
  exit 0
}
trap cleanup SIGINT SIGTERM

###############################################################################
# 6.  Summary & run Flask
###############################################################################
echo
good "🎯  All helper services started"
info "🌐  Flask app:      http://localhost:5000"
info "📊  Tail logs:      tail -f celery_worker.log celery_beat.log"
if mailhog_running; then
  info "📧  MailHog UI:     http://localhost:8025"
else
  warn "⚠️   MailHog not available – emails will NOT be captured"
fi
echo "Press Ctrl-C to stop everything."
echo

exec python app.py
