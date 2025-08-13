from flask import Blueprint, render_template, session, request, redirect, url_for, flash, jsonify
from models.models import db, Subjects, Chapters, Scores, Questions, Quizzes, Users, Admin
from functools import wraps
from werkzeug.security import check_password_hash
import sqlite3
from flask.views import MethodView
from datetime import datetime, time
import os
from werkzeug.utils import secure_filename
from PIL import Image
import time as time_module
from matplotlib import pyplot as plt
from io import BytesIO
import base64
from sqlalchemy import func, or_, desc

adminpy = Blueprint("admin", __name__)

UPLOAD_FOLDER = 'static/images/profiles'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def plot_to_base64(fig):
    buf = BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

def get_conn():
    database_path = db.engine.url.database
    conn = sqlite3.connect(database_path)
    conn.row_factory = sqlite3.Row
    return conn

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session or session.get('role') != 'admin':
            flash('Please login as admin first', 'error')
            return jsonify({"error": "Authentication required", "redirect": "/admin/login"}), 401
        return f(*args, **kwargs)
    return decorated_function

@adminpy.route("/admin/api/login", methods=["POST"])
def admin_login_api():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    admin = Admin.query.filter_by(username=username).first()
    
    if admin and admin.password == password:
        session['logged_in'] = True
        session['role'] = 'admin'
        session['username'] = username
        return jsonify({
            "message": "Login successful",
            "redirect": "/admin/page"
        }), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@adminpy.route("/admin_logout", methods=["GET", "POST"])
@admin_required
def admin_logout():
    flash("Logged out successfully", "success")
    session.clear()
    return jsonify({"message": "Logged out successfully", "redirect": "/"}), 200

@adminpy.route("/sess")
def debug_session():
    return {
        "username": session.get("username"),
        "role": session.get("role"),
        "logged_in": session.get("logged_in"),
    }

from routes.cache import get_cache, set_cache

@adminpy.route("/api/admin/dashboard")
@admin_required
def admin_dashboard_api():
    username = session.get("username")
    admin = Admin.query.filter_by(username=username).first()
    
    cache_key = "admin_dashboard"
    cached_response = get_cache(cache_key)
    if cached_response:
        return jsonify(cached_response)

    subjects = Subjects.query.all()
    subjData = [{
        'id': s.id,
        'name': s.name,
        'description': s.description
    } for s in subjects]

    quizzes = Quizzes.query.all()
    quizData = []
    for q in quizzes:
        dateStr = None
        if q.date_of_quiz:
            if hasattr(q.date_of_quiz, 'strftime'):
                dateStr = q.date_of_quiz.strftime('%Y-%m-%d')
            else:
                dateStr = str(q.date_of_quiz).split(' ')[0]

        timeDur = None
        if q.time_duration:
            if hasattr(q.time_duration, 'hour'):
                timeDur = q.time_duration.hour * 60 + q.time_duration.minute
            else:
                timeDur = int(q.time_duration) if q.time_duration else 0

        qData = {
            'id': q.id,
            'name': q.name,
            'description': q.description,
            'date_of_quiz': dateStr,
            'time_duration': timeDur,
            'chapter_id': getattr(q, 'chapter_id', None),
            'remarks': getattr(q, 'remarks', '')
        }
        quizData.append(qData)

    response = {
        "success": True,
        "username": username,
        "admin_name": admin.name if admin else None,
        "subjects": subjData,
        "quizzes": quizData
    }

    set_cache(cache_key, response, ttl=300)
    return jsonify(response)

@adminpy.route("/admin/profile", methods=["GET", "POST"])
@admin_required
def admin_profile_api():
    username = session.get("username")
    admin = Admin.query.filter_by(username=username).first()
    
    if not admin:
        return jsonify({"success": False, "message": "Admin not found"}), 404

    if request.method == "GET":
        profData = {
            "id": admin.id,
            "username": admin.username,
            "name": admin.name,
            "email": admin.email,
            "role": admin.role,
            "profile_image": admin.profile_image or "default-admin.png",
            "created_at": admin.created_at.strftime('%d %b %Y') if hasattr(admin, 'created_at') and admin.created_at else 'N/A'
        }
        return jsonify({
            "success": True,
            "admin": profData
        })
    elif request.method == "POST":
        data = request.get_json()
        if data.get('name'):
            admin.name = data['name']
        if data.get('email'):
            admin.email = data['email']
        if data.get('profile_image'):
            admin.profile_image = data['profile_image']
        
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })

@adminpy.route("/admin/upload_profile_image", methods=["POST"])
@admin_required
def upload_profile_image():
    if 'profile_image' not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    file = request.files['profile_image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected"}), 400

    if file and allowed_file(file.filename):
        username = session.get("username")
        timestamp = int(time_module.time())
        origExt = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{username}_{timestamp}.{origExt}"
        filename = secure_filename(filename)
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        with Image.open(filepath) as img:
            img.thumbnail((400, 400), Image.Resampling.LANCZOS)
            img.save(filepath, optimize=True, quality=85)

        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "filename": filename
        })
    else:
        return jsonify({
            "success": False,
            "message": "Invalid file type. Please upload JPEG, PNG, GIF, or WebP images."
        }), 400

@adminpy.route("/admin/edit/<item_type>/<int:item_id>", methods=["GET", "POST"])
@admin_required
def edit_item(item_type, item_id):
    modelMap = {
        "subject": Subjects,
        "chapter": Chapters,
        "quiz": Quizzes,
        "question": Questions
    }
    
    itemModel = modelMap.get(item_type)
    if not itemModel:
        return "Invalid item type", 400

    item = itemModel.query.get_or_404(item_id)

    if item_type == "subject":
        return redirect(url_for('admin.create_subject', item_id=item.id))
    elif item_type == "chapter":
        return redirect(url_for('admin.create_chapter', item_id=item.id))
    elif item_type == "quiz":
        return redirect(url_for('admin.create_quiz', item_id=item.id))
    elif item_type == "question":
        return redirect(url_for('admin.create_question', item_id=item.id))

    return "Item type not yet supported for editing", 501

class AdminCreateEditAPI(MethodView):
    def get(self):
        formType = request.args.get('form', 'subject')
        itemId = request.args.get('id', type=int)

        data = {
            'admin_name': self._get_admin_name(),
            'form_type': formType,
            'subjects': [s.to_dict() for s in Subjects.query.all()],
            'chapters': [c.to_dict() for c in Chapters.query.all()],
            'quizzes': [q.to_dict() for q in Quizzes.query.all()]
        }

        if itemId:
            editItem = self._get_edit_item(formType, itemId)
            if editItem:
                data['edit_item'] = editItem
            else:
                return jsonify({'success': False, 'message': 'Item not found'}), 404

        return jsonify(data)

    def post(self):
        data = request.get_json()
        formType = data.get('form_type')
        itemId = data.get('id')

        if not formType:
            return jsonify({'success': False, 'message': 'form_type is required'}), 400

        if itemId:
            item = self._update_item(formType, data, itemId)
            message = f"{formType.title()} updated successfully"
        else:
            item = self._create_item(formType, data)
            message = f"{formType.title()} created successfully"

        db.session.commit()
        return jsonify({
            'success': True,
            'message': message,
            'data': item.to_dict()
        })

    def _get_admin_name(self):
        username = session.get("username")
        admin = Admin.query.filter_by(username=username).first()
        return admin.name if admin else "Admin"

    def _get_edit_item(self, formType, itemId):
        models = {'subject': Subjects, 'chapter': Chapters, 'quiz': Quizzes, 'question': Questions}
        model = models.get(formType)
        item = model.query.get(itemId) if model else None
        return item.to_dict() if item else None

    def _create_item(self, formType, data):
        if formType == 'subject':
            item = Subjects(name=data['name'], description=data['description'])
        elif formType == 'chapter':
            item = Chapters(name=data['name'], description=data['description'], subject_id=data['subject_id'])
        elif formType == 'quiz':
            dateStr = data['date_of_quiz']
            if isinstance(dateStr, str):
                if ' ' in dateStr:
                    quizDate = datetime.strptime(dateStr, '%Y-%m-%d %H:%M:%S')
                else:
                    quizDate = datetime.fromisoformat(dateStr)
            else:
                quizDate = dateStr

            minutes = int(data['time_duration'])
            quizTime = time(hour=minutes // 60, minute=minutes % 60)

            item = Quizzes(
                name=data['name'],
                description=data['description'],
                time_duration=quizTime,
                date_of_quiz=quizDate,
                chapter_id=data['chapter_id'],
                remarks=data.get('remarks', '')
            )
        elif formType == 'question':
            item = Questions(
                question=data['question'],
                option1=data['option1'],
                option2=data['option2'],
                option3=data['option3'],
                option4=data['option4'],
                correct_option=data['correct_option'],
                quiz_id=data['quiz_id']
            )
        
        db.session.add(item)
        return item

    def _update_item(self, formType, data, itemId):
        models = {'subject': Subjects, 'chapter': Chapters, 'quiz': Quizzes, 'question': Questions}
        item = models[formType].query.get_or_404(itemId)

        if formType == 'subject':
            item.name = data['name']
            item.description = data['description']
        elif formType == 'chapter':
            item.name = data['name']
            item.description = data['description']
            item.subject_id = data['subject_id']
        elif formType == 'quiz':
            item.name = data['name']
            item.description = data['description']
            item.chapter_id = data['chapter_id']
            item.remarks = data.get('remarks', '')

            if 'date_of_quiz' in data:
                dateStr = data['date_of_quiz']
                if isinstance(dateStr, str):
                    if ' ' in dateStr:
                        item.date_of_quiz = datetime.strptime(dateStr, '%Y-%m-%d %H:%M:%S')
                    else:
                        item.date_of_quiz = datetime.fromisoformat(dateStr)
                else:
                    item.date_of_quiz = dateStr

            if 'time_duration' in data:
                minutes = int(data['time_duration'])
                item.time_duration = time(hour=minutes // 60, minute=minutes % 60)

        elif formType == 'question':
            item.question = data['question']
            item.option1 = data['option1']
            item.option2 = data['option2']
            item.option3 = data['option3']
            item.option4 = data['option4']
            item.correct_option = data['correct_option']
            item.quiz_id = data['quiz_id']

        return item

@adminpy.route('/api/admin/database', methods=['GET'])
@admin_required
def admin_database_api():
    page = request.args.get("page")
    data = {
        'success': True,
        'selected_type': page,
        'selected': [],
        'admin_name': session.get("username")
    }

    if page == "subject":
        subjects = Subjects.query.all()
        data['selected'] = [{
            'id': s.id,
            'name': s.name,
            'description': s.description
        } for s in subjects]
    elif page == "chapter":
        chapters = Chapters.query.all()
        data['selected'] = [{
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'subject_id': c.subject_id
        } for c in chapters]
    elif page == "quiz":
        quizzes = Quizzes.query.all()
        data['selected'] = [{
            'id': q.id,
            'name': q.name,
            'description': q.description,
            'date_of_quiz': q.date_of_quiz.strftime('%Y-%m-%d') if q.date_of_quiz else None,
            'time_duration': (q.time_duration.hour * 60 + q.time_duration.minute) if q.time_duration else None,
            'chapter_id': getattr(q, 'chapter_id', None),
            'remarks': getattr(q, 'remarks', '')
        } for q in quizzes]
    elif page == "question":
        questions = Questions.query.all()
        data['selected'] = [{
            'id': q.id,
            'question': q.question,
            'option1': q.option1,
            'option2': q.option2,
            'option3': q.option3,
            'option4': q.option4,
            'correct_option': q.correct_option,
            'quiz_id': q.quiz_id
        } for q in questions]
    else:
        return jsonify({"success": False, "message": "Invalid page type"}), 400

    return jsonify(data)

@adminpy.route('/api/admin/subjects/<int:subject_id>/chapters', methods=['GET'])
@admin_required
def get_subject_chapters(subject_id):
    chapters = Chapters.query.filter_by(subject_id=subject_id).all()
    chapters_data = []
    
    for c in chapters:
        chapters_data.append({
            'id': c.id,
            'name': c.name,
            'description': getattr(c, 'description', ''),
            'total_questions': len(c.quizzes) if hasattr(c, 'quizzes') else 0
        })

    return jsonify(chapters_data)

@adminpy.route('/api/admin/<form_type>/<int:item_id>', methods=['DELETE'])
@admin_required
def delete_item_api(form_type, item_id):
    model = {
        'subject': Subjects,
        'chapter': Chapters,
        'quiz': Quizzes,
        'question': Questions
    }.get(form_type)

    if not model:
        return jsonify({'success': False, 'message': 'Invalid form type'}), 400

    item = model.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()

    return jsonify({'success': True, 'message': f'{form_type.title()} deleted successfully'})

@adminpy.route('/api/admin/users')
@admin_required
def admin_users_api():
    users = Users.query.all()
    username = session.get("username")
    admin = Admin.query.filter_by(username=username).first()

    usersData = []
    for user in users:
        totalAttempts = Scores.query.filter_by(user_id=user.id).count()
        avgScore = db.session.query(func.avg(Scores.total_scored)).filter_by(user_id=user.id).scalar()
        
        userData = {
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'email': user.email,
            'total_attempts': totalAttempts,
            'avg_score': float(avgScore) if avgScore else 0.0
        }
        usersData.append(userData)

    return jsonify({
        "success": True,
        "admin_name": admin.name if admin else "Admin",
        "users": usersData,
        "total_users": len(usersData)
    })

@adminpy.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user_api(user_id):
    user = Users.query.get_or_404(user_id)
    userName = user.name

    Scores.query.filter_by(user_id=user_id).delete()
    db.session.delete(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'{userName} deleted successfully!'
    })

@adminpy.route('/api/admin/users/<int:user_id>/scores')
@admin_required
def get_user_scores_api(user_id):
    user = Users.query.get_or_404(user_id)
    scores = Scores.query.filter_by(user_id=user_id).options(
        db.joinedload(Scores.quiz)
    ).order_by(Scores.time_stamp_of_submission.desc()).all()

    scoresData = []
    for score in scores:
        scoreData = {
            'id': score.id,
            'quiz_name': score.quiz.name if score.quiz else 'Unknown Quiz',
            'total_scored': score.total_scored,
            'timestamp': score.time_stamp_of_submission.strftime('%Y-%m-%d %H:%M') if score.time_stamp_of_submission else 'N/A'
        }
        scoresData.append(scoreData)

    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'email': user.email
        },
        'scores': scoresData
    })

@adminpy.route("/api/admin/search")
@admin_required
def admin_search_api():
    query = request.args.get("q", "").strip().lower()
    username = session.get("username")
    admin = Admin.query.filter_by(username=username).first()

    if not query:
        return jsonify({
            "success": True,
            "query": query,
            "admin_name": admin.name if admin else "Admin",
            "results": {
                "users": [],
                "subjects": [],
                "quizzes": [],
                "chapters": []
            },
            "total_results": 0
        })

    users = Users.query.filter(or_(
        func.cast(Users.id, db.String).contains(query),
        func.lower(Users.username).contains(query),
        func.lower(Users.name).contains(query),
        func.lower(Users.email).contains(query)
    )).all()

    subjects = Subjects.query.filter(or_(
        func.lower(Subjects.name).contains(query),
        func.cast(Subjects.id, db.String).contains(query),
        func.lower(Subjects.description).contains(query)
    )).all()

    chapters = Chapters.query.filter(or_(
        func.cast(Chapters.id, db.String).contains(query),
        func.lower(Chapters.name).contains(query),
        func.lower(Chapters.description).contains(query)
    )).all()

    quizzes = Quizzes.query.filter(or_(
        func.cast(Quizzes.id, db.String).contains(query),
        func.lower(Quizzes.name).contains(query),
        func.lower(Quizzes.description).contains(query)
    )).all()

    usersData = [{
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'email': user.email,
        'type': 'user'
    } for user in users]

    subjData = [{
        'id': subject.id,
        'name': subject.name,
        'description': subject.description,
        'type': 'subject'
    } for subject in subjects]

    chaptersData = [{
        'id': chapter.id,
        'name': chapter.name,
        'description': chapter.description,
        'subject_id': chapter.subject_id,
        'type': 'chapter'
    } for chapter in chapters]

    quizData = []
    for quiz in quizzes:
        dateStr = None
        if quiz.date_of_quiz:
            if hasattr(quiz.date_of_quiz, 'strftime'):
                dateStr = quiz.date_of_quiz.strftime('%Y-%m-%d')
            elif isinstance(quiz.date_of_quiz, str):
                dateStr = datetime.strptime(quiz.date_of_quiz.split(' ')[0], '%Y-%m-%d').strftime('%Y-%m-%d')
            else:
                dateStr = str(quiz.date_of_quiz).split(' ')[0]

        qData = {
            'id': quiz.id,
            'name': quiz.name,
            'description': quiz.description,
            'date_of_quiz': dateStr,
            'type': 'quiz'
        }
        quizData.append(qData)

    totalResults = len(usersData) + len(subjData) + len(chaptersData) + len(quizData)

    return jsonify({
        "success": True,
        "query": query,
        "admin_name": admin.name if admin else "Admin",
        "results": {
            "users": usersData,
            "subjects": subjData,
            "quizzes": quizData,
            "chapters": chaptersData
        },
        "total_results": totalResults
    })

@adminpy.route('/api/admin/summary')
@admin_required
def admin_summary_api():
    totalUsers = Users.query.count()
    totalQuizzes = Quizzes.query.count()
    totalAttempts = Scores.query.count()
    username = session.get("username")
    admin = Admin.query.filter_by(username=username).first()

    popQuizzes = db.session.query(
        Quizzes.name,
        func.count(Scores.id).label('attempts'),
        func.avg(Scores.total_scored).label('avg_score')
    ).join(Scores).group_by(Quizzes.id).order_by(desc('attempts')).limit(5).all()

    activeUsers = db.session.query(
        Users.username,
        func.count(Scores.id).label('attempts'),
        func.avg(Scores.total_scored).label('avg_score')
    ).join(Scores).group_by(Users.id).order_by(desc('attempts')).limit(5).all()

    recentAttempts = Scores.query.options(
        db.joinedload(Scores.user),
        db.joinedload(Scores.quiz)
    ).order_by(Scores.time_stamp_of_submission.desc()).limit(10).all()

    newUsers = Users.query.order_by(Users.id.desc()).limit(10).all()

    plt.switch_backend('Agg')

    quizImg = None
    if popQuizzes:
        quizNames = [q[0] for q in popQuizzes]
        attempts = [q[1] for q in popQuizzes]
        fig1, ax1 = plt.subplots(figsize=(10, 6))
        ax1.barh(quizNames, attempts, color='#28a745')
        ax1.set_title('Most Popular Quizzes', fontsize=16, fontweight='bold')
        ax1.set_xlabel('Number of Attempts')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        quizImg = plot_to_base64(fig1)
        plt.close(fig1)

    scoreImg = None
    allScores = [s.total_scored for s in Scores.query.all()]
    if allScores:
        fig2, ax2 = plt.subplots(figsize=(10, 6))
        ax2.hist(allScores, bins=20, color='#007bff', alpha=0.7)
        ax2.set_title('Score Distribution', fontsize=16, fontweight='bold')
        ax2.set_xlabel('Score')
        ax2.set_ylabel('Frequency')
        plt.tight_layout()
        scoreImg = plot_to_base64(fig2)
        plt.close(fig2)

    responseData = {
        "success": True,
        "admin_name": admin.name if admin else "Admin",
        "stats": {
            "total_users": totalUsers,
            "total_quizzes": totalQuizzes,
            "total_attempts": totalAttempts
        },
        "popular_quizzes": [{
            "name": q[0],
            "attempts": q[1],
            "avg_score": float(q[2]) if q[2] else 0
        } for q in popQuizzes],
        "active_users": [{
            "username": u[0],
            "attempts": u[1],
            "avg_score": float(u[2]) if u[2] else 0
        } for u in activeUsers],
        "recent_attempts": [{
            "username": attempt.user.username,
            "quiz_name": attempt.quiz.name,
            "score": attempt.total_scored,
            "timestamp": attempt.time_stamp_of_submission.strftime('%Y-%m-%d %H:%M') if attempt.time_stamp_of_submission else 'N/A'
        } for attempt in recentAttempts],
        "new_users": [{
            "id": user.id,
            "username": user.username,
            "email": user.email
        } for user in newUsers],
        "charts": {
            "quiz_chart": quizImg,
            "score_chart": scoreImg
        }
    }

    return jsonify(responseData)

adminpy.add_url_rule(
    '/api/admin/create_edit',
    view_func=AdminCreateEditAPI.as_view('create_edit_api')
)

import csv
import smtplib
from datetime import timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from routes.tasks import send_daily_reminders, export_quiz_data
from routes.cache import clear_all as clear_cache_all

@adminpy.route('/api/admin/send_daily_reminders', methods=['POST'])
@admin_required
def trigger_daily_reminders():
    from routes.tasks import send_dual_reminder, send_daily_reminders
    
    data = request.get_json() or {}
    quiz_id = data.get('quiz_id')
    custom_message = data.get('custom_message', '')
    send_method = data.get('send_method', 'both')

    if quiz_id:
        quiz = Quizzes.query.get(quiz_id)
        quiz_name = quiz.name if quiz else "Selected Quiz"
        users = Users.query.filter_by(role='user').limit(3).all()
        sent_counts = {'gchat': 0, 'email': 0}
        
        for user in users:
            results = send_dual_reminder(
                quiz_name=quiz_name,
                username=user.username,
                email=getattr(user, 'email', None),
                custom_msg=custom_message,
                send_email=send_method in ['email', 'both'],
                send_gchat=send_method in ['gchat', 'both']
            )
            
            if results['gchat']:
                sent_counts['gchat'] += 1
            if results['email']:
                sent_counts['email'] += 1

        result = f"Reminders sent for {quiz_name} - Google Chat: {sent_counts['gchat']}, Email: {sent_counts['email']}"
    else:
        result = send_daily_reminders()

    return jsonify({"success": True, "message": result})

@adminpy.route('/api/admin/cache_info', methods=['GET'])
@admin_required
def get_cache_info():
    from routes.cache import _cache
    
    cache_entries = []
    total_size = 0
    
    for key, value in _cache.items():
        exp_time = value['exp'].strftime('%Y-%m-%d %H:%M:%S') if value['exp'] else 'No expiry'
        data_str = str(value['data'])
        size = len(data_str)
        total_size += size
        
        cache_entries.append({
            'key': key,
            'expires': exp_time,
            'size': f"{size}B"
        })

    cache_info = {
        'total_entries': len(cache_entries),
        'memory_used': f"{total_size}B",
        'entries': cache_entries[:10]
    }

    return jsonify({'success': True, 'cache_info': cache_info})

@adminpy.route('/api/admin/export_quiz_data', methods=['POST'])
def api_export():
    fname = export_quiz_data()
    return {'success': True, 'message': f'export OK → {fname}', 'filename': fname}

@adminpy.route('/api/admin/clear_cache', methods=['POST'])
@admin_required
def clear_cache():
    from routes.cache import clear_all
    cleared_count = clear_all()
    return jsonify({
        'success': True,
        'message': f'Cache cleared successfully! {cleared_count} entries removed.'
    })
