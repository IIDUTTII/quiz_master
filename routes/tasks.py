import requests
import json
import smtplib
import csv
import os
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_mail import Mail, Message
from flask import current_app


from routes.workers import celery

# google chat webhook url
GOOGLE_CHAT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAODOt6Tk/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Xx0Uf6K84KQan0RztnkWYT9IXzlC2FT1kmpkKBNdMNU"

mail = Mail()

def init_mail(app):
    mail.init_app(app)
    return mail



# helper function to get app context without circular import
def get_app_context():
    try:
        from flask import current_app
        return current_app._get_current_object()
    except:
        # fallback - import app only when needed
        from app import app
        return app
    

def get_flask_app():
    """Compatibility function - same as get_app_context"""
    return get_app_context()

# email sending functions
def send_notification(to_email, subject, message):
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            body=message,
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"email sending error: {e}")
        return False

def send_report_email(to_email, report_data, format_type='html'):
    try:
        subject = f"Monthly Quiz Report - {report_data['period']}"
        
        if format_type == 'html':
            html_body = f"""
            <h2>Monthly Quiz Report - {report_data['period']}</h2>
            <p>Hi {report_data['user_name']}!</p>
            <h3>Your Performance Summary:</h3>
            <ul>
                <li>Total Quizzes: {report_data['total_quizzes']}</li>
                <li>Total Correct: {report_data['total_correct']}</li>
                <li>Average Score: {report_data['average_score']:.1f}%</li>
            </ul>
            <p>Keep up the good work!</p>
            """
            msg = Message(
                subject=subject,
                recipients=[to_email],
                html=html_body,
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
        else:
            text_body = f"""
Monthly Quiz Report - {report_data['period']}

Hi {report_data['user_name']}!

Your Performance Summary:
- Total Quizzes: {report_data['total_quizzes']}
- Total Correct: {report_data['total_correct']}
- Average Score: {report_data['average_score']:.1f}%

Keep up the good work!
            """
            msg = Message(
                subject=subject,
                recipients=[to_email],
                body=text_body,
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"report email error: {e}")
        return False

def send_csv_notification(to_email, user_name, filename, download_url):
    try:
        subject = "Quiz Data Export Ready"
        message = f"""Hi {user_name}!

Your quiz data export is ready for download.

File Details:
- Filename: {filename}
- Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- Download Link: {download_url}

The CSV file contains all your quiz attempt data.

Thanks,
Quiz Master Team"""
        
        return send_notification(to_email, subject, message)
    except Exception as e:
        print(f"csv notification error: {e}")
        return False

# THE MONTHLY REPORT TASK - FIXED WITHOUT CIRCULAR IMPORT
@celery.task(name='routes.tasks.generate_monthly_report')
def generate_monthly_report(user_id, format_type='html'):
    app = get_app_context()
    
    with app.app_context():
        try:
            from models.models import Users, Scores
            
            # FIXED: Get current month range instead of previous month
            def get_current_month_date_range():
                today = datetime.today()
                # First day of current month
                first_day_current_month = datetime(today.year, today.month, 1)
                # Current date (today)
                current_date = datetime(today.year, today.month, today.day, 23, 59, 59)
                return first_day_current_month, current_date
            
            start_date, end_date = get_current_month_date_range()
            
            user = Users.query.get(user_id)
            if not user:
                raise Exception(f"user {user_id} not found")
            
            quiz_scores = Scores.query.filter_by(user_id=user_id).filter(
                Scores.time_stamp_of_submission >= start_date,
                Scores.time_stamp_of_submission <= end_date
            ).all()
            
            total_quizzes = len(quiz_scores)
            total_correct = sum(1 for score in quiz_scores if score.total_scored >= 60)
            average_score = sum(score.total_scored for score in quiz_scores) / total_quizzes if total_quizzes > 0 else 0.0
            
            report_data = {
                'user_name': user.name or user.username,
                'period': start_date.strftime("%B %Y"),  # Will show "July 2025"
                'total_quizzes': total_quizzes,
                'total_correct': total_correct,
                'average_score': average_score
            }
            
            print(f"monthly report generated for {user.username}: {report_data}")
            
            # FIXED: Actually send the email (this was missing!)
            email_sent = send_report_email(user.email, report_data, format_type)
            
            if email_sent:
                return {'status': 'success', 'message': 'Monthly report sent successfully', 'data': report_data}
            else:
                return {'status': 'error', 'message': 'Report generated but email failed to send', 'data': report_data}
                
        except Exception as e:
            print(f'monthly report failed: {str(e)}')
            return {'status': 'error', 'message': f'Report generation failed: {str(e)}'}


# CSV EXPORT TASK - FIXED WITHOUT CIRCULAR IMPORT
@celery.task(name='routes.tasks.export_user_data')
def export_user_data(user_id):
    app = get_app_context()
    
    with app.app_context():
        try:
            from models.models import Users, Scores, db
            
            user = Users.query.get(user_id)
            if not user:
                raise Exception(f"user {user_id} not found")
            
            scores = Scores.query.filter_by(user_id=user_id).all()
            
            # create filename with timestamp
            filename = f"{user.username}_quiz_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            filepath = os.path.join('static/exports', filename)
            
            # make sure export directory exists
            os.makedirs('static/exports', exist_ok=True)
            
            # write csv file
            with open(filepath, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Quiz Name', 'Date Taken', 'Score', 'Questions Attempted', 'Correct Answers', 'Wrong Answers'])
                
                for score in scores:
                    quiz_name = score.quiz.name if hasattr(score, 'quiz') and score.quiz else 'Unknown Quiz'
                    date_taken = score.time_stamp_of_submission.strftime('%Y-%m-%d') if score.time_stamp_of_submission else 'N/A'
                    
                    writer.writerow([
                        quiz_name,
                        date_taken,
                        score.total_scored or 0,
                        score.attempted_questions or 0,
                        score.correct_answers or 0,
                        score.wrong_answers or 0
                    ])
            
            print(f"csv exported for {user.username}: {filename} ({len(scores)} records)")
            
            return {
                'status': 'success',
                'filename': filename,
                'records_exported': len(scores),
                'file_path': filepath
            }
            
        except Exception as e:
            print(f'csv export failed: {str(e)}')
            return {'status': 'error', 'message': f'export failed: {str(e)}'}

# EMAIL REMINDER FUNCTIONS
def send_email_reminder(email, username, quiz_name, custom_msg=""):
    try:
        message_text = custom_msg or f"hi {username}! dont forget to take the '{quiz_name}' quiz. visit quiz master to continue learning!"
        
        msg = MIMEMultipart()
        msg['From'] = 'quiz-app@localhost'
        msg['To'] = email
        msg['Subject'] = f'quiz reminder - {quiz_name}'
        
        html_body = f"""
        <html>
            <body>
                <h2>Quiz Master Reminder</h2>
                <p>{message_text}</p>
                <p>this is an automated reminder from quiz master.</p>
                <p>visit our platform to continue your learning journey!</p>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # send via local smtp server
        with smtplib.SMTP('localhost', 1025) as server:
            server.send_message(msg)
        
        print(f"email reminder sent to {email}")
        return True
    except Exception as e:
        print(f"email reminder error: {e}")
        return False

def send_google_chat_reminder(quiz_name, username="user"):
    try:
        message_payload = {
            "text": f"🎯 quiz reminder: {username}, dont forget about '{quiz_name}' quiz!"
        }
        
        response = requests.post(
            GOOGLE_CHAT_WEBHOOK,
            headers={'Content-Type': 'application/json'},
            data=json.dumps(message_payload),
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"google chat reminder sent for {quiz_name}")
            return True
        else:
            print(f"google chat error: status {response.status_code}")
            return False
    except Exception as e:
        print(f"google chat reminder error: {e}")
        return False

def send_reminder_to_all(quiz_name, custom_msg=""):
    try:
        app = get_app_context()
        with app.app_context():
            from models.models import Users
            
            users = Users.query.all()
            success_count = 0
            
            for user in users:
                if user.email:
                    if send_email_reminder(user.email, user.username, quiz_name, custom_msg):
                        success_count += 1
            
            # also send to google chat
            send_google_chat_reminder(quiz_name)
            
            print(f"bulk reminders sent to {success_count} users")
            return success_count
    except Exception as e:
        print(f"bulk reminder error: {e}")
        return 0

def send_daily_summary():
    try:
        app = get_app_context()
        with app.app_context():
            from models.models import Scores
            
            today = datetime.now().date()
            
            # count todays quiz attempts
            daily_attempts = Scores.query.filter(
                Scores.time_stamp_of_submission >= today
            ).count()
            
            message_text = f"📊 daily summary ({today}): {daily_attempts} quiz attempts today"
            
            # send to google chat
            send_google_chat_reminder("daily summary", message_text)
            print(f"daily summary sent: {daily_attempts} attempts")
            return True
    except Exception as e:
        print(f"daily summary error: {e}")
        return False

# FUNCTIONS THAT ADMIN_PAGE.PY IS TRYING TO IMPORT
def send_daily_reminders():
    """send daily reminder notifications"""
    try:
        result = send_daily_summary()
        if result:
            return "daily reminders sent successfully"
        else:
            return "daily reminders failed"
    except Exception as e:
        print(f"daily reminders error: {e}")
        return f"daily reminders error: {str(e)}"

def export_quiz_data():
    """export all quiz data (admin function)"""
    try:
        app = get_app_context()
        with app.app_context():
            from models.models import Scores
            
            all_scores = Scores.query.all()
            filename = f"all_quiz_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            filepath = os.path.join('static/exports', filename)
            
            os.makedirs('static/exports', exist_ok=True)
            
            with open(filepath, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['User ID', 'Username', 'Quiz Name', 'Date', 'Score', 'Questions', 'Correct', 'Wrong'])
                
                for score in all_scores:
                    user = score.user if hasattr(score, 'user') else None
                    quiz = score.quiz if hasattr(score, 'quiz') else None
                    
                    writer.writerow([
                        score.user_id or 'N/A',
                        user.username if user else 'Unknown',
                        quiz.name if quiz else 'Unknown',
                        score.time_stamp_of_submission.strftime('%Y-%m-%d') if score.time_stamp_of_submission else 'N/A',
                        score.total_scored or 0,
                        score.attempted_questions or 0,
                        score.correct_answers or 0,
                        score.wrong_answers or 0
                    ])
            
            print(f"admin export completed: {filename} ({len(all_scores)} records)")
            return filename
    except Exception as e:
        print(f"admin export error: {e}")
        return f"export_failed_{datetime.now().strftime('%Y%m%d')}.csv"

def send_dual_reminder(quiz_name, username, email=None, custom_msg="", send_email=True, send_gchat=True):
    results = {'gchat': False, 'email': False}
    
    if send_gchat:
        results['gchat'] = send_google_chat_reminder(quiz_name, username)
    
    if send_email and email:
        results['email'] = send_email_reminder(email, username, quiz_name, custom_msg)
    
    return results