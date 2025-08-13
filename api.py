
from flask import Blueprint, jsonify, request, session
from models.models import Subjects, Chapters, Quizzes, Users, Scores, Questions, Admin
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, or_, desc
from models.models import db
from routes.admin.admin_page import admin_required
import json

apipy = Blueprint("api", __name__)




@apipy.route("/api")
def get_api():
    return jsonify({
        "message": "Quiz Master API v2.0",
        "version": "2.0.0",
        "description": "Advanced Quiz Application API with Celery background jobs",
        "endpoints": {
            "users": "/api/users",
            "subjects": "/api/subjects", 
            "chapters": "/api/chapters",
            "quizzes": "/api/quizzes",
            "questions": "/api/questions",
            "scores": "/api/scores",
            "analytics": "/api/analytics",
            "health": "/api/health"
        }
    })

@apipy.route("/api/health")
def health_check():
    try:
        
        user_count = Users.query.count()
        quiz_count = Quizzes.query.count()
        
   
        redis_status = "unknown"
        try:
            from routes.workers import celery
            inspect = celery.control.inspect()
            stats = inspect.stats()
            redis_status = "connected" if stats else "disconnected"
        except:
            redis_status = "unavailable"
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "redis": redis_status,
            "stats": {
                "total_users": user_count,
                "total_quizzes": quiz_count
            }
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@apipy.route("/api/users")
@admin_required
def get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        users = Users.query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = {
            "users": [{
                "id": user.id,
                "name": user.name,
                "username": user.username,
                "email": user.email,
                "role": getattr(user, 'role', 'user')
            } for user in users.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": users.total,
                "pages": users.pages
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/users/<int:user_id>")  
@admin_required
def get_user(user_id):
    try:
        user = Users.query.get_or_404(user_id)
        
        # Get user statistics
        total_attempts = Scores.query.filter_by(user_id=user_id).count()
        avg_score = db.session.query(func.avg(Scores.total_scored)).filter_by(user_id=user_id).scalar()
        
        return jsonify({
            "id": user.id,
            "name": user.name,
            "username": user.username, 
             "email": user.email,
            "role": getattr(user, 'role', 'user'),
             "statistics": {
                "total_attempts": total_attempts,
                "average_score": float(avg_score) if avg_score else 0.0
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 404

# Subject APIs
@apipy.route("/api/subjects")
@admin_required
def get_subjects():
    try:
        subjects = Subjects.query.all()
        result = [{
            "id": s.id, 
            "name": s.name,
            "description": getattr(s, 'description', ''),
            "chapter_count": len(getattr(s, 'chapters', []))
        } for s in subjects]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/subjects/<int:subject_id>/chapters")
@admin_required
def get_subject_chapters(subject_id):
    try:
        subject = Subjects.query.get_or_404(subject_id)
        chapters = Chapters.query.filter_by(subject_id=subject_id).all()
        
        result = {
            "subject": {
                "id": subject.id,
                "name": subject.name,
                "description": getattr(subject, 'description', '')
            },
            "chapters": [{
                "id": c.id,
                "name": c.name,
                "description": getattr(c, 'description', ''),
                "quiz_count": len(getattr(c, 'quizzes', []))
            } for c in chapters]
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@apipy.route("/api/chapters")
@admin_required
def get_chapters():
    try:
        chapters = Chapters.query.all()
        result = [{
            "id": chapter.id,
            "name": chapter.name,
            "description": getattr(chapter, 'description', ''),
            "subject_id": chapter.subject_id,
            "subject_name": chapter.subject.name if chapter.subject else None
        } for chapter in chapters]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/chapters/<int:chapter_id>/quizzes")
@admin_required
def get_chapter_quizzes(chapter_id):
    try:
        chapter = Chapters.query.get_or_404(chapter_id)
        quizzes = Quizzes.query.filter_by(chapter_id=chapter_id).all()
        
        result = {
            "chapter": {
                "id": chapter.id,
                "name": chapter.name,
                "description": getattr(chapter, 'description', '')
            },
            "quizzes": [{
                "id": q.id,
                "name": q.name,
                "description": getattr(q, 'description', ''),
                "date_of_quiz": q.date_of_quiz.isoformat() if q.date_of_quiz else None,
                "question_count": len(getattr(q, 'questions', []))
            } for q in quizzes]
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@apipy.route("/api/quizzes")
@admin_required
def get_all_quizzes():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        quizzes = Quizzes.query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = {
            "quizzes": [{
                "id": q.id,
                "name": q.name,
                "description": getattr(q, 'description', ''),
                "date_of_quiz": q.date_of_quiz.isoformat() if q.date_of_quiz else None,
                "chapter_id": getattr(q, 'chapter_id', None),
                "chapter_name": q.chapter.name if hasattr(q, 'chapter') and q.chapter else None,
                "question_count": len(getattr(q, 'questions', []))
            } for q in quizzes.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": quizzes.total,
                "pages": quizzes.pages
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/quizzes/<int:quiz_id>")
@admin_required
def get_quiz(quiz_id):
    try:
        quiz = Quizzes.query.get_or_404(quiz_id)
        
        # Get quiz statistics
        total_attempts = Scores.query.filter_by(quiz_id=quiz_id).count()
        avg_score = db.session.query(func.avg(Scores.total_scored)).filter_by(quiz_id=quiz_id).scalar()
        
        return jsonify({
            "id": quiz.id,
            "name": quiz.name,
            "description": getattr(quiz, 'description', ''),
            "date_of_quiz": quiz.date_of_quiz.isoformat() if quiz.date_of_quiz else None,
            "time_duration": str(quiz.time_duration) if quiz.time_duration else None,
            "chapter_id": getattr(quiz, 'chapter_id', None),
            "chapter_name": quiz.chapter.name if hasattr(quiz, 'chapter') and quiz.chapter else None,
            "question_count": len(getattr(quiz, 'questions', [])),
            "statistics": {
                "total_attempts": total_attempts,
                "average_score": float(avg_score) if avg_score else 0.0
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@apipy.route("/api/questions")
@admin_required 
def get_questions():
    try:
        quiz_id = request.args.get('quiz_id', type=int)
        
        if quiz_id:
            questions = Questions.query.filter_by(quiz_id=quiz_id).all()
        else:
            questions = Questions.query.limit(50).all()  # Limit for performance
        
        result = [{
            "id": q.id,
            "question": q.question,
            "options": [q.option1, q.option2, q.option3, q.option4],
            "quiz_id": q.quiz_id,
            "quiz_name": q.quiz.name if q.quiz else None
            # Note: Not exposing correct_option for security
        } for q in questions]
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/quizzes/<int:quiz_id>/questions")
@admin_required
def get_quiz_questions(quiz_id):
    try:
        quiz = Quizzes.query.get_or_404(quiz_id)
        questions = Questions.query.filter_by(quiz_id=quiz_id).all()
        
        result = {
            "quiz": {
                "id": quiz.id,
                "name": quiz.name,
                "description": getattr(quiz, 'description', '')
            },
            "questions": [{
                "id": q.id,
                "question": q.question,
                "options": [q.option1, q.option2, q.option3, q.option4]
                # Note: Not exposing correct_option for security
            } for q in questions]
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@apipy.route("/api/scores")
@admin_required
def get_scores():
    try:
        user_id = request.args.get('user_id', type=int)
        quiz_id = request.args.get('quiz_id', type=int)
        limit = request.args.get('limit', 50, type=int)
        
        query = Scores.query.options(
            db.joinedload(Scores.user),
            db.joinedload(Scores.quiz)
        )
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        if quiz_id:
            query = query.filter_by(quiz_id=quiz_id)
            
        scores = query.order_by(Scores.time_stamp_of_attempt.desc()).limit(limit).all()
        
        result = [{
            "id": s.id,
            "user_id": s.user_id,
            "username": s.user.username if s.user else None,
            "quiz_id": s.quiz_id,
            "quiz_name": s.quiz.name if s.quiz else None,
            "total_scored": s.total_scored,
            "correct_answers": s.correct_answers,
            "wrong_answers": s.wrong_answers,
            "attempted_questions": s.attempted_questions,
            "time_taken": s.time_taken,
            "timestamp": s.time_stamp_of_attempt.isoformat() if s.time_stamp_of_attempt else None
        } for s in scores]
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/user/<int:user_id>/quizzes")
@admin_required
def get_user_quizzes(user_id):
    try:
        user = Users.query.get_or_404(user_id)
        scores = Scores.query.filter_by(user_id=user_id).all()
        quiz_ids = {score.quiz_id for score in scores}
        quizzes = Quizzes.query.filter(Quizzes.id.in_(quiz_ids)).all()
        
        result = {
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name
            },
            "quizzes": [{
                "quiz_id": quiz.id,
                "quiz_name": quiz.name,
                "attempts": len([s for s in scores if s.quiz_id == quiz.id]),
                "best_score": max([s.total_scored for s in scores if s.quiz_id == quiz.id])
            } for quiz in quizzes]
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@apipy.route("/api/analytics/overview")
@admin_required
def get_analytics_overview():
    try:
        # Basic statistics
        total_users = Users.query.count()
        total_quizzes = Quizzes.query.count()
        total_attempts = Scores.query.count()
        total_questions = Questions.query.count()
        
        # Popular quizzes
        popular_quizzes = db.session.query(
            Quizzes.name,
            func.count(Scores.id).label('attempts'),
            func.avg(Scores.total_scored).label('avg_score')
        ).join(Scores).group_by(Quizzes.id).order_by(desc('attempts')).limit(5).all()
        
        # Active users
        active_users = db.session.query(
            Users.username,
            func.count(Scores.id).label('attempts'),
            func.avg(Scores.total_scored).label('avg_score')
        ).join(Scores).group_by(Users.id).order_by(desc('attempts')).limit(5).all()
        
        return jsonify({
            "overview": {
                "total_users": total_users,
                "total_quizzes": total_quizzes,
                "total_attempts": total_attempts,
                "total_questions": total_questions
            },
            "popular_quizzes": [{
                "name": q[0],
                "attempts": q[1],
                "avg_score": float(q[2]) if q[2] else 0
            } for q in popular_quizzes],
            "active_users": [{
                "username": u[0], 
                "attempts": u[1],
                "avg_score": float(u[2]) if u[2] else 0
            } for u in active_users]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/analytics/performance")
@admin_required
def get_performance_analytics():
    try:
        # Score distribution
        all_scores = [s.total_scored for s in Scores.query.all()]
        
        # Calculate percentiles
        import numpy as np
        if all_scores:
            percentiles = {
                "p25": float(np.percentile(all_scores, 25)),
                "p50": float(np.percentile(all_scores, 50)),  # median
                "p75": float(np.percentile(all_scores, 75)),
                "p90": float(np.percentile(all_scores, 90))
            }
            avg_score = float(np.mean(all_scores))
        else:
            percentiles = {"p25": 0, "p50": 0, "p75": 0, "p90": 0}
            avg_score = 0
        
    
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_scores = Scores.query.filter(
            Scores.time_stamp_of_attempt >= thirty_days_ago
        ).all()
        
        return jsonify({
            "overall_performance": {
                "total_attempts": len(all_scores),
                "average_score": avg_score,
                "percentiles": percentiles
            },
            "recent_trend": {
                "last_30_days_attempts": len(recent_scores),
                "recent_avg_score": float(np.mean([s.total_scored for s in recent_scores])) if recent_scores else 0
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@apipy.route("/api/search")
@admin_required
def search_api():
    try:
        query = request.args.get("q", "").strip().lower()
        search_type = request.args.get("type", "all")  # all, users, quizzes, subjects
        limit = request.args.get("limit", 10, type=int)
        
        if not query:
            return jsonify({
                "query": query,
                "results": {},
                "total_results": 0
            })
        
        results = {}
        total = 0
        
        if search_type in ["all", "users"]:
            users = Users.query.filter(or_(
                func.lower(Users.username).contains(query),
                func.lower(Users.name).contains(query),
                func.lower(Users.email).contains(query)
            )).limit(limit).all()
            
            results["users"] = [{
                "id": u.id,
                "username": u.username,
                "name": u.name,
                "email": u.email,
                "type": "user"
            } for u in users]
            total += len(users)
        
        if search_type in ["all", "quizzes"]:
            quizzes = Quizzes.query.filter(or_(
                func.lower(Quizzes.name).contains(query),
                func.lower(Quizzes.description).contains(query)
            )).limit(limit).all()
            
            results["quizzes"] = [{
                "id": q.id,
                "name": q.name, 
                "description": getattr(q, 'description', ''),
                "type": "quiz"
            } for q in quizzes]
            total += len(quizzes)
        
        if search_type in ["all", "subjects"]:
            subjects = Subjects.query.filter(or_(
                func.lower(Subjects.name).contains(query),
                func.lower(Subjects.description).contains(query)
            )).limit(limit).all()
            
            results["subjects"] = [{
                "id": s.id,
                "name": s.name,
                "description": getattr(s, 'description', ''),
                "type": "subject"
            } for s in subjects]
            total += len(subjects)
        
        return jsonify({
            "query": query,
            "search_type": search_type,
            "results": results,
            "total_results": total
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apipy.route("/api/tasks/status/<task_id>")
@admin_required
def get_task_status(task_id):
    try:
        from routes.workers import celery
        result = celery.AsyncResult(task_id)
        
        return jsonify({
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.status == 'SUCCESS' else None,
            "error": str(result.result) if result.status == 'FAILURE' else None
        })
    except ImportError:
        return jsonify({"error": "Celery not available"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@apipy.route("/api/export/users")
@admin_required
def export_users():
    try:
        format_type = request.args.get('format', 'json')  # json, csv
        
        users = Users.query.all()
        users_data = [{
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "total_attempts": Scores.query.filter_by(user_id=user.id).count()
        } for user in users]
        
        if format_type == 'csv':
            import csv
            from io import StringIO
            
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=['id', 'name', 'username', 'email', 'total_attempts'])
            writer.writeheader()
            writer.writerows(users_data)
            
            from flask import Response
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': 'attachment; filename=users_export.csv'}
            )
        else:
            return jsonify({
                "export_type": "users",
                "format": format_type,
                "timestamp": datetime.now().isoformat(),
                "data": users_data
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
