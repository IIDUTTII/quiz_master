from flask import Blueprint, request, jsonify, session, render_template, redirect, url_for, flash, make_response
from models.models import db, Users, Quizzes, Chapters, Scores, Subjects, Questions
from functools import wraps
import sqlite3
import time
import json
from datetime import datetime
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import numpy as np
from sqlalchemy import func, or_, desc
from routes.cache import get_cache, set_cache

userpy = Blueprint('user', __name__)

def user_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "username" not in session or session.get("role") != "user":
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

def plot_to_base64(fig):
    img = BytesIO()
    fig.savefig(img, format='png', bbox_inches='tight')
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode()
    plt.close(fig)
    return plot_url

@userpy.route("/user/login", methods=["GET", "POST"])
def user_login_api():
    if request.method == "GET":
        if 'logged_in' in session and session.get('role') == 'user':
            return jsonify({
                "success": True,
                "message": "You are already logged in as user",
                "redirect": "/user/page"
            })
        return jsonify({"success": True, "message": "Ready for login"})

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Please provide both username and password"}), 400

    user = Users.query.filter_by(username=username).first()

    if user and password == user.password:
        session["username"] = user.username
        session["role"] = user.role if user.role else "user"
        session["logged_in"] = True
        return jsonify({
            "success": True,
            "message": "Login successful",
            "redirect": "/user/page",
            "user": {"username": user.username, "role": session["role"]}
        })
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

@userpy.route("/logout", methods=["GET", "POST"])
@user_required
def user_logout():
    session.clear()
    return jsonify({
        "success": True,
        "message": "Logged out successfully",
        "redirect": "/"
    })

@userpy.route("/user/profile", methods=["GET", "POST"])
@user_required
def user_profile_api():
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if request.method == "GET":
        profData = {
            "username": user.username,
            "name": getattr(user, 'name', ''),
            "email": getattr(user, 'email', ''),
            "profile_image": getattr(user, 'profile_image', 'default-user.png')
        }
        return jsonify({"success": True, "profile": profData})

    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400

    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        user.email = data['email']

    db.session.commit()
    return jsonify({
        "success": True,
        "message": "Profile updated successfully"
    })

@userpy.route("/user/upload_profile_image", methods=["POST"])
@user_required
def upload_user_profile_image():
    if 'profile_image' not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    file = request.files['profile_image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"}), 400

    allowed_types = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    fileExt = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if fileExt not in allowed_types:
        return jsonify({
            "success": False,
            "message": "Invalid file type. Use PNG, JPG, GIF, or WebP only."
        }), 400

    username = session.get("username")
    import time
    timestamp = int(time.time())
    filename = f"user_{username}_{timestamp}.{fileExt}"

    upload_folder = 'static/images/profiles'
    import os
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    from PIL import Image
    with Image.open(filepath) as img:
        img.thumbnail((300, 300))
        img.save(filepath, optimize=True, quality=85)

    user = Users.query.filter_by(username=username).first()
    if user:
        user.profile_image = filename
        db.session.commit()

    return jsonify({
        "success": True,
        "message": "Image uploaded successfully",
        "filename": filename
    })

@userpy.route("/user/take_quiz", methods=["GET", "POST"])
@user_required
def take_quiz_api():
    if request.method == "GET":
        quiz_id = request.args.get("quiz_id")
        if not quiz_id or quiz_id == 'null':
            return jsonify({"success": False, "message": "Quiz ID is required"}), 400
    elif request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400
        quiz_id = data.get('quiz_id')
        if not quiz_id:
            return jsonify({"success": False, "message": "Quiz ID is required in request body"}), 400

    quiz = Quizzes.query.get(quiz_id)
    if not quiz:
        return jsonify({"success": False, "message": "Quiz not found"}), 404

    user = Users.query.filter_by(username=session["username"]).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if request.method == "GET":
        quiz_session = session.setdefault('quiz_data', {}).setdefault(str(quiz_id), {
            'quiz_answers': {},
            'start_time': int(time.time()),
        })

        duration = 3600
        if quiz.time_duration:
            if hasattr(quiz.time_duration, 'hour'):
                duration = (quiz.time_duration.hour * 3600) + (quiz.time_duration.minute * 60) + quiz.time_duration.second
            else:
                duration = int(quiz.time_duration) * 60

        elapsed_time = int(time.time()) - quiz_session['start_time']
        remaining_time = max(int(duration - elapsed_time), 0)

        questions_data = []
        for q in quiz.questions:
            questions_data.append({
                'id': q.id,
                'question': q.question,
                'option1': q.option1,
                'option2': q.option2,
                'option3': q.option3,
                'option4': q.option4
            })

        return jsonify({
            "success": True,
            "quiz": {
                "id": quiz.id,
                "name": quiz.name,
                "time_duration": duration,
                "remaining_time": remaining_time
            },
            "questions": questions_data,
            "total_questions": len(questions_data),
            "quiz_answers": quiz_session['quiz_answers']
        })

    elif request.method == "POST":
        quiz_answers = data.get('answers', {})
        success = calculate_and_store_quiz_score(quiz_id, quiz_answers, user.id)

        if success:
            session.get('quiz_data', {}).pop(str(quiz_id), None)
            session.modified = True
            return jsonify({
                "success": True,
                "message": "Quiz submitted successfully!",
                "redirect": "/user/quiz_scores"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Error saving quiz score"
            }), 500

def calculate_and_store_quiz_score(quiz_id, quiz_answers=None, user_id=None):
    quiz = Quizzes.query.get_or_404(quiz_id)
    quiz_session = session.get('quiz_data', {}).get(str(quiz_id), {})

    if quiz_answers is None:
        quiz_answers = quiz_session.get('quiz_answers', {})

    questions = quiz.questions
    correct = sum(
        1 for q in questions
        if str(q.id) in quiz_answers and int(quiz_answers[str(q.id)]) == q.correct_option
    )

    attempted = sum(1 for q in questions if str(q.id) in quiz_answers)
    time_taken = int(time.time()) - quiz_session.get('start_time', time.time())

    score = Scores(
        quiz_id=quiz_id,
        user_id=user_id,
        time_stamp_of_attempt=datetime.utcnow(),
        total_scored=correct,
        time_taken=time_taken,
        correct_answers=correct,
        wrong_answers=attempted - correct,
        attempted_questions=attempted,
        answer_details=json.dumps(quiz_answers)
    )

    db.session.add(score)
    db.session.commit()
    return True

@userpy.route("/user/quiz_scores", methods=["GET"])
@user_required
def quiz_scores_api():
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    scores = Scores.query.filter_by(user_id=user.id).order_by(Scores.time_stamp_of_attempt.desc()).all()
    scores_data = []

    for s in scores:
        time_str = 'N/A'
        if s.time_stamp_of_attempt:
            if hasattr(s.time_stamp_of_attempt, 'strftime'):
                time_str = s.time_stamp_of_attempt.strftime('%d-%m-%y | %H:%M')
            else:
                time_str = str(s.time_stamp_of_attempt)

        percentage = 0
        if s.attempted_questions and s.attempted_questions > 0:
            percentage = round((s.correct_answers / s.attempted_questions * 100), 2)

        score_data = {
            'quiz_name': s.quiz.name if s.quiz else 'N/A',
            'correct': s.correct_answers or 0,
            'attempted': s.attempted_questions or 0,
            'percentage': percentage,
            'time': time_str
        }
        scores_data.append(score_data)

    return jsonify({
        "success": True,
        "user": {"username": user.username},
        "user_scores": scores_data
    })

@userpy.route("/user/quiz_details", methods=["GET"])
@user_required
def quiz_details_api():
    quiz_name = request.args.get("quiz_name")
    if not quiz_name:
        return jsonify({"success": False, "message": "Quiz name is required"}), 400

    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    quiz = Quizzes.query.filter_by(name=quiz_name).first()
    if not quiz:
        return jsonify({"success": False, "message": "Quiz not found"}), 404

    score_record = Scores.query.filter_by(user_id=user.id, quiz_id=quiz.id).order_by(Scores.time_stamp_of_attempt.desc()).first()
    if not score_record:
        return jsonify({"success": False, "message": "No score record found"}), 404

    user_answers = {}
    if score_record.answer_details:
        user_answers = json.loads(score_record.answer_details)

    questions_data = []
    for q in quiz.questions:
        questions_data.append({
            'id': q.id,
            'question': q.question,
            'option1': q.option1,
            'option2': q.option2,
            'option3': q.option3,
            'option4': q.option4,
            'correct_option': q.correct_option
        })

    return jsonify({
        "success": True,
        "questions": questions_data,
        "user_answers": user_answers
    })

@userpy.route("/user/page", methods=["GET"])
@user_required
def user_page_api():
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found", "redirect": "/user/login"}), 404

    cache_key = f"user_dashboard_{user.id}"
    cached_response = get_cache(cache_key)
    if cached_response:
        return jsonify(cached_response)

    subjects = Subjects.query.all()
    subjects_data = [{
        'id': s.id,
        'name': s.name,
        'description': getattr(s, 'description', '')
    } for s in subjects]

    chapters = Chapters.query.all()
    chapters_data = []
    for c in chapters:
        chapters_data.append({
            'id': c.id,
            'name': c.name,
            'subject_id': c.subject_id,
            'subject_name': c.subject.name if c.subject else 'Unknown'
        })

    quizzes = Quizzes.query.all()
    quizzes_data = []
    for q in quizzes:
        date_str = 'No date'
        if q.date_of_quiz:
            if hasattr(q.date_of_quiz, 'strftime'):
                date_str = q.date_of_quiz.strftime('%d %b %Y')
            else:
                date_str = str(q.date_of_quiz).split(' ')[0]

        subject_id = None
        subject_name = 'Unknown'
        chapter_id = getattr(q, 'chapter_id', None)
        chapter_name = 'Unknown'

        if hasattr(q, 'chapter') and q.chapter:
            chapter_id = q.chapter.id
            chapter_name = q.chapter.name
            if hasattr(q.chapter, 'subject') and q.chapter.subject:
                subject_id = q.chapter.subject.id
                subject_name = q.chapter.subject.name

        quiz_data = {
            'id': q.id,
            'name': q.name,
            'date_of_quiz': date_str,
            'description': getattr(q, 'description', ''),
            'chapter_id': chapter_id,
            'chapter_name': chapter_name,
            'subject_id': subject_id,
            'subject_name': subject_name
        }
        quizzes_data.append(quiz_data)

    response_payload = {
        "success": True,
        "user": {"username": user.username},
        "subjects": subjects_data,
        "chapters": chapters_data,
        "quizzes": quizzes_data
    }

    set_cache(cache_key, response_payload, ttl=300)
    return jsonify(response_payload)

@userpy.route("/user/summary", methods=["GET"])
@user_required
def user_summary_api():
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    scores = Scores.query.filter_by(user_id=user.id).all()
    total_quizzes = len(scores)

    if total_quizzes == 0:
        return jsonify({"success": True, "no_data": True})

    total_attempted = sum(s.attempted_questions for s in scores if s.attempted_questions)
    total_correct = sum(s.correct_answers for s in scores if s.correct_answers)
    total_wrong = sum(s.wrong_answers for s in scores if s.wrong_answers)

    accuracy = round((total_correct / total_attempted * 100), 2) if total_attempted > 0 else 0
    avg_time = round(np.mean([s.time_taken for s in scores if s.time_taken]) / 60, 1) if scores else 0

    quiz_stats = db.session.query(
        Quizzes.name,
        func.count(Scores.id),
        func.avg(Scores.total_scored),
        func.max(Scores.total_scored)
    ).join(Scores).filter(Scores.user_id == user.id).group_by(Quizzes.name).all()

    plt.switch_backend('Agg')

    progress_data = sorted([s for s in scores if s.time_stamp_of_attempt],
                          key=lambda x: x.time_stamp_of_attempt)

    if progress_data:
        progress_dates = [s.time_stamp_of_attempt.strftime('%Y-%m-%d') for s in progress_data]
        progress_scores = [s.total_scored for s in progress_data]

        fig1, ax1 = plt.subplots(figsize=(10, 6))
        ax1.plot(progress_dates, progress_scores, marker='o')
        ax1.set_title('Score Progress Over Time')
        ax1.set_xlabel('Date')
        ax1.set_ylabel('Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        progress_img = plot_to_base64(fig1)
    else:
        progress_img = None

    if quiz_stats:
        quiz_names = [q[0] for q in quiz_stats]
        avg_scores = [float(q[2]) for q in quiz_stats]

        fig2, ax2 = plt.subplots(figsize=(10, 6))
        ax2.bar(quiz_names, avg_scores)
        ax2.set_title('Average Score per Quiz')
        ax2.set_ylabel('Average Score')
        plt.xticks(rotation=45)
        plt.tight_layout()
        quiz_perf_img = plot_to_base64(fig2)
    else:
        quiz_perf_img = None

    return jsonify({
        "success": True,
        "total_quizzes": total_quizzes,
        "accuracy": accuracy,
        "avg_time": avg_time,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "quiz_stats": [[q[0], int(q[1]), float(q[2]), int(q[3])] for q in quiz_stats],
        "progress_img": progress_img,
        "quiz_perf_img": quiz_perf_img
    })

@userpy.route("/user/page/search")
@user_required
def user_search_api():
    query = request.args.get("q", "").strip().lower()
    username = session.get("username")

    if not query:
        return jsonify({
            "success": True,
            "query": query,
            "results": {
                "subjects": [],
                "quizzes": [],
                "chapters": []
            },
            "total_results": 0
        })

    subjects = Subjects.query.filter(or_(
        func.lower(Subjects.name).contains(query),
        func.cast(Subjects.id, db.String).contains(query),
        func.lower(Subjects.description).contains(query)
    )).all()

    subjData = [{
        'id': subject.id,
        'name': subject.name,
        'description': subject.description or ''
    } for subject in subjects]

    chapters = Chapters.query.filter(or_(
        func.cast(Chapters.id, db.String).contains(query),
        func.lower(Chapters.name).contains(query),
        func.lower(Chapters.description).contains(query)
    )).all()

    chaptersData = [{
        'id': chapter.id,
        'name': chapter.name,
        'description': chapter.description or '',
        'subject_id': chapter.subject_id
    } for chapter in chapters]

    quizzes = Quizzes.query.filter(or_(
        func.cast(Quizzes.id, db.String).contains(query),
        func.lower(Quizzes.name).contains(query),
        func.lower(Quizzes.description).contains(query)
    )).all()

    quizData = []
    for quiz in quizzes:
        dateStr = None
        if quiz.date_of_quiz:
            if hasattr(quiz.date_of_quiz, 'strftime'):
                dateStr = quiz.date_of_quiz.strftime('%Y-%m-%d')
            elif isinstance(quiz.date_of_quiz, str):
                dateStr = quiz.date_of_quiz.split(' ')[0]
            else:
                dateStr = str(quiz.date_of_quiz)

        quizData.append({
            'id': quiz.id,
            'name': quiz.name,
            'description': quiz.description or '',
            'date_of_quiz': dateStr
        })

    totalResults = len(subjData) + len(chaptersData) + len(quizData)

    return jsonify({
        "success": True,
        "query": query,
        "results": {
            "subjects": subjData,
            "quizzes": quizData,
            "chapters": chaptersData
        },
        "total_results": totalResults
    })

@userpy.route("/user/request_monthly_report", methods=["GET"])
@user_required
def request_monthly_report():
    from models.models import Users
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    format_type = request.args.get('format', 'html')

    from routes.workers import celery
    task = celery.send_task(
        'routes.tasks.generate_monthly_report',
        args=[user.id, format_type]
    )

    return jsonify({
        "success": True,
        "message": f"Monthly report ({format_type.upper()}) will be sent to your email shortly!",
        "task_id": task.id
    })

@userpy.route("/user/export_quiz_data", methods=["POST"])
@user_required
def export_quiz_data_api():
    username = session.get("username")
    user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    from routes.workers import celery
    task = celery.send_task(
        'routes.tasks.export_user_data',
        args=[user.id]
    )

    return jsonify({
        "success": True,
        "message": "CSV export started! You will receive the file shortly.",
        "task_id": task.id
    })

@userpy.route("/user/notification_settings", methods=["GET", "POST"])
@user_required
def notification_settings():
    if request.method == "GET":
        response_data = {
            "success": True,
            "settings": {
                "dailyRem": True,
                "reminderTime": "18:00",
                "emailNoti": True,
                "weeklyReport": False
            }
        }
        return jsonify(response_data)
    else:
        data = request.get_json()
        return jsonify({
            "success": True,
            "message": "Settings saved successfully!"
        })

@userpy.route("/user/debug_auth", methods=["GET"])
def debug_auth():
    return jsonify({
        "session_data": {
            "logged_in": session.get("logged_in"),
            "username": session.get("username"),
            "role": session.get("role")
        },
        "session_keys": list(session.keys())
    })

@userpy.route("/user/task_status/<task_id>", methods=["GET"])
@user_required
def get_task_status(task_id):
    from routes.workers import celery
    result = celery.AsyncResult(task_id)
    return jsonify({
        "success": True,
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.status == 'SUCCESS' else str(result.result) if result.result else None
    })

@userpy.route("/user/download_export/<filename>", methods=["GET"])
@user_required
def download_export_file(filename):
    import os
    from flask import send_file, current_app

    if not filename.endswith('.csv'):
        return jsonify({"success": False, "message": "Invalid file type"}), 400

    username = session.get("username")
    if not filename.startswith(username):
        return jsonify({"success": False, "message": "Unauthorized access"}), 403

    filepath = os.path.join('static/exports', filename)
    if not os.path.exists(filepath):
        return jsonify({"success": False, "message": "File not found"}), 404

    return send_file(
        filepath,
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )
