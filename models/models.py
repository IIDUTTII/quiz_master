from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, Enum
import sqlalchemy
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from datetime import time as datetime_time 
db = SQLAlchemy()
from sqlalchemy import event
import json
from sqlalchemy.types import TypeDecorator

class SafeDateTime(TypeDecorator):
    impl = sqlalchemy.DateTime
    
    def process_result_value(self, value, dialect):
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        return value

class Extracter:
    def to_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}

class Users(Extracter, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum("user"), nullable=False, default="user")
    email = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(50), nullable=False, default="Unknown")
    profile_image = db.Column(db.String(200), nullable=True, default="default-user.png")
    created_at = db.Column(db.DateTime, nullable=True)

class Admin(Extracter, db.Model):
    __tablename__ = "admin"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum("admin"), nullable=False, default="admin")
    profile_image = db.Column(db.String(200), nullable=True, default="default-admin.png")
    created_at = db.Column(db.DateTime, nullable=True)

class Subjects(Extracter, db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(50), nullable=False)
    chapters = db.relationship("Chapters", back_populates='subject', cascade="all, delete-orphan")
    
    def to_dict(self):
        try:
            data = {
                'id': self.id,
                'name': self.name,
                'description': self.description
            }
            
            try:
                from models.models import Chapters
                chapters = Chapters.query.filter_by(subject_id=self.id).all()
                data["chapters"] = []
                for chapter in chapters:
                   
                    chapter_data = {
                        'id': chapter.id,
                        'name': chapter.name,
                        'description': chapter.description,
                        'subject_id': chapter.subject_id,
                        'total_questions': 0 
                    }
                    data["chapters"].append(chapter_data)
            except Exception as chapter_error:
                print(f"Error loading chapters for subject {self.id}: {chapter_error}")
                data["chapters"] = []
            
            return data
        except Exception as e:
            print(f"Error in Subjects.to_dict() for subject {self.id}: {e}")
           
            return {
                'id': getattr(self, 'id', None),
                'name': getattr(self, 'name', 'Unknown Subject'),
                'description': getattr(self, 'description', ''),
                'chapters': []
            }

class Chapters(Extracter, db.Model):
    __tablename__ = "chapters"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(50), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    quizzes = db.relationship("Quizzes", back_populates='chapter', cascade="all, delete-orphan")
    subject = db.relationship("Subjects", back_populates='chapters')
    
    def to_dict(self):
        """Override to include calculated total_questions"""
        data = super().to_dict()
     
        total_questions = 0
        for quiz in self.quizzes:
            total_questions += len(quiz.questions)
        data["total_questions"] = total_questions
        return data

class Quizzes(Extracter, db.Model):
    __tablename__ = "quizzes"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(50), nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey('chapters.id'), nullable=False)
  
    date_of_quiz = db.Column(db.DateTime, nullable=False)
    time_duration = db.Column(db.Time, nullable=False, default=lambda: datetime_time(0, 50, 0))  # ✅ Fixed
    remarks = db.Column(db.String(100))
    questions = db.relationship("Questions", back_populates='quiz', cascade="all, delete-orphan")
    chapter = db.relationship("Chapters", back_populates='quizzes')
    
    def to_dict(self):
        data = super().to_dict()
        
        try:
            if self.date_of_quiz:
                if hasattr(self.date_of_quiz, 'strftime'):
                    data["date_of_quiz"] = self.date_of_quiz.strftime("%Y-%m-%d")
                else:
                 
                    data["date_of_quiz"] = str(self.date_of_quiz).split(' ')[0]
            else:
                data["date_of_quiz"] = None
        except:
            data["date_of_quiz"] = None
        
        # Clean time handling
        try:
            if self.time_duration and hasattr(self.time_duration, 'hour'):
                data["time_duration"] = self.time_duration.hour * 60 + self.time_duration.minute
            else:
                data["time_duration"] = 0
        except:
            data["time_duration"] = 0
        
        return data
    
    def set_date_of_quiz(self, value):
        if isinstance(value, str):
            
            if ' ' in value:
                self.date_of_quiz = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            else:
                self.date_of_quiz = datetime.strptime(value, '%Y-%m-%d')
        else:
            self.date_of_quiz = value
    
    def set_time_duration(self, value):
        if isinstance(value, (str, int)):
            minutes = int(value)
            hours = minutes // 60
            mins = minutes % 60
            self.time_duration = datetime_time(hour=hours, minute=mins, second=0)  # ✅ Fixed
        else:
            self.time_duration = value

class Questions(Extracter, db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question = db.Column(db.String(50), nullable=False, unique=True)
    option1 = db.Column(db.String(50), nullable=False)
    option2 = db.Column(db.String(50), nullable=False)
    option3 = db.Column(db.String(50), nullable=False)
    option4 = db.Column(db.String(50), nullable=False)
    correct_option = db.Column(db.String(50), nullable=False)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    quiz = db.relationship("Quizzes", back_populates='questions')

class Scores(Extracter, db.Model):
    __tablename__ = 'scores'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    time_stamp_of_attempt = db.Column(db.DateTime, default=datetime.utcnow)
    time_stamp_of_submission = db.Column(db.DateTime, default=datetime.utcnow)
    total_scored = db.Column(db.Integer, nullable=False)
    time_taken = db.Column(db.Integer)  # in seconds
    correct_answers = db.Column(db.Integer, nullable=False)
    wrong_answers = db.Column(db.Integer)
    attempted_questions = db.Column(db.Integer)
    
    answer_details = db.Column(db.Text)
    quiz = db.relationship("Quizzes", backref="scores")
    user = db.relationship("Users", backref="scores")
    
    def __init__(self, **kwargs):
        
        if 'answer_details' in kwargs and not isinstance(kwargs['answer_details'], str):
            kwargs['answer_details'] = json.dumps(kwargs['answer_details'])
        super().__init__(**kwargs)
    
    @property
    def answers(self):
        """Helper property to deserialize answer_details"""
        return json.loads(self.answer_details) if self.answer_details else {}
