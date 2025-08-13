const TakeQuizPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            user: { username: 'Loading...' },
            quiz: {},
            questions: [],
            answers: {},
            currentQuestion: 0,
            remainingTime: 0,
            totalQuestions: 0,
            loading: false,
            error: null,
            quizStarted: false,
            timer: null,
            showCancelModal: false,
            showSubmitModal: false  
        };
    },
    async mounted() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/static/css/quiz.css';
        document.head.appendChild(link);

        const quizId = this.$route.query.quiz_id;
        if (!quizId || quizId === 'null') {
            this.error = 'Invalid quiz ID';
            return;
        }
        await this.loadQuiz(quizId);
    },
    methods: {
        async loadQuiz(quizId) {
            this.loading = true;
            this.error = null;
            
            try {
                console.log(`Loading quiz ${quizId}`);
                const response = await fetch(`/user/take_quiz?quiz_id=${quizId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('Quiz data received:', data);
                
                if (data.success) {
                    this.quiz = data.quiz;
                    this.questions = data.questions;
                    this.totalQuestions = data.total_questions;
                    this.remainingTime = data.quiz.remaining_time;
                    this.answers = data.quiz_answers || {};
                    this.user = { username: 'User' };
                    this.quizStarted = true;
                    
                    if (this.remainingTime > 0) {
                        this.startTimer();
                    }
                } else {
                    this.error = data.message;
                }
            } catch (error) {
                console.error('Load quiz error:', error);
                this.error = 'Network error: ' + error.message;
            } finally {
                this.loading = false;
            }
        },

        startTimer() {
            this.timer = setInterval(() => {
                if (this.remainingTime > 0) {
                    this.remainingTime--;
                } else {
                    this.confirmSubmitQuiz(); }
            }, 1000);
        },

        selectAnswer(questionId, option) {
            this.answers[questionId] = option;
        },

        jumpToQuestion(index) {
            this.currentQuestion = index;
        },

        nextQuestion() {
            if (this.currentQuestion < this.totalQuestions - 1) {
                this.currentQuestion++;
            }
        },

        prevQuestion() {
            if (this.currentQuestion > 0) {
                this.currentQuestion--;
            }
        },

        cancelQuiz() {
            this.showCancelModal = true;
        },

        confirmCancel() {
            console.log('user cancelled quiz');
            if (this.timer) {
                clearInterval(this.timer);
            }
            this.showCancelModal = false;
            this.$router.push('/user/page');
        },

        closeCancelModal() {
            this.showCancelModal = false;
        },

    
        confirmSubmitQuiz() {
            this.showSubmitModal = true;
        },

        closeSubmitModal() {
            this.showSubmitModal = false;
        },

        async submitQuiz() {
            console.log('submitting quiz with answers:', this.answers);
            
            if (this.timer) {
                clearInterval(this.timer);
            }
            
            this.showSubmitModal = false; // close modal first
            this.loading = true; // show loading during submission
            
            try {
                const response = await fetch('/user/take_quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quiz_id: this.quiz.id,
                        answers: this.answers
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Quiz submitted successfully!');
                    this.$router.push('/user/quiz_scores');
                } else {
                    this.error = data.message;
                }
            } catch (error) {
                this.error = 'Error submitting quiz: ' + error.message;
            } finally {
                this.loading = false;
            }
        },

        // ✅ Calculate answered vs unanswered questions
        getAnsweredCount() {
            return Object.keys(this.answers).length;
        },

        getUnansweredCount() {
            return this.totalQuestions - this.getAnsweredCount();
        },

        formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        },

        logout() {
            if (confirm('Are you sure you want to logout?')) {
                this.$router.push('/logout');
            }
        },

        handleSearch(query) {
            this.$router.push({ path: '/user/page/search', query: { q: query } });
        }
    },
    beforeUnmount() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    },
    template: `
        <div>
            <UNavBar 
                :user="user.username" 
                userType="user"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">{{ showSubmitModal ? 'Submitting quiz...' : 'Loading quiz...' }}</span>
                </div>
            </div>

            <div v-if="error" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ error }}
                <button class="btn btn-secondary mt-2" @click="$router.push('/user/page')">
                    Back to Home
                </button>
            </div>
            
            <div v-if="!loading && !error && quizStarted" class="container mt-4">
                <!-- Quiz Header with Cancel Button -->
                <div class="card mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4>{{ quiz.name || 'Quiz' }}</h4>
                        <div class="d-flex align-items-center gap-3">
                            <!-- Cancel Quiz Button -->
                            <button class="btn btn-outline-danger btn-sm" @click="cancelQuiz">
                                <i class="fas fa-times"></i> Cancel Quiz
                            </button>
                            <!-- Timer -->
                            <div class="badge bg-danger fs-6">
                                Time Left: {{ formatTime(remainingTime) }}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Question Navigation -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="d-flex flex-wrap gap-2">
                            <button 
                                v-for="(question, idx) in questions" 
                                :key="question.id"
                                class="btn btn-sm"
                                :class="[
                                    currentQuestion === idx ? 'btn-primary' : 
                                    answers[question.id] ? 'btn-success' : 'btn-outline-secondary'
                                ]"
                                @click="jumpToQuestion(idx)">
                                {{ idx + 1 }}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Current Question -->
                <div v-if="questions[currentQuestion]" class="card mb-4">
                    <div class="card-header">
                        <h5>Question {{ currentQuestion + 1 }} of {{ totalQuestions }}</h5>
                    </div>
                    <div class="card-body">
                        <p class="fs-5 mb-4">{{ questions[currentQuestion].question }}</p>
                        
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input 
                                        class="form-check-input" 
                                        type="radio" 
                                        :name="'question_' + questions[currentQuestion].id"
                                        :id="'option1_' + questions[currentQuestion].id"
                                        :checked="answers[questions[currentQuestion].id] == 1"
                                        @change="selectAnswer(questions[currentQuestion].id, 1)">
                                    <label class="form-check-label" :for="'option1_' + questions[currentQuestion].id">
                                        A. {{ questions[currentQuestion].option1 }}
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input 
                                        class="form-check-input" 
                                        type="radio" 
                                        :name="'question_' + questions[currentQuestion].id"
                                        :id="'option2_' + questions[currentQuestion].id"
                                        :checked="answers[questions[currentQuestion].id] == 2"
                                        @change="selectAnswer(questions[currentQuestion].id, 2)">
                                    <label class="form-check-label" :for="'option2_' + questions[currentQuestion].id">
                                        B. {{ questions[currentQuestion].option2 }}
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input 
                                        class="form-check-input" 
                                        type="radio" 
                                        :name="'question_' + questions[currentQuestion].id"
                                        :id="'option3_' + questions[currentQuestion].id"
                                        :checked="answers[questions[currentQuestion].id] == 3"
                                        @change="selectAnswer(questions[currentQuestion].id, 3)">
                                    <label class="form-check-label" :for="'option3_' + questions[currentQuestion].id">
                                        C. {{ questions[currentQuestion].option3 }}
                                    </label>
                                </div>
                            </div>
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input 
                                        class="form-check-input" 
                                        type="radio" 
                                        :name="'question_' + questions[currentQuestion].id"
                                        :id="'option4_' + questions[currentQuestion].id"
                                        :checked="answers[questions[currentQuestion].id] == 4"
                                        @change="selectAnswer(questions[currentQuestion].id, 4)">
                                    <label class="form-check-label" :for="'option4_' + questions[currentQuestion].id">
                                        D. {{ questions[currentQuestion].option4 }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Navigation Buttons -->
                <div class="d-flex justify-content-between mb-4">
                    <button 
                        class="btn btn-secondary" 
                        @click="prevQuestion"
                        :disabled="currentQuestion === 0">
                        <i class="fas fa-arrow-left"></i> Previous
                    </button>
                    
                    <button 
                        v-if="currentQuestion < totalQuestions - 1"
                        class="btn btn-primary" 
                        @click="nextQuestion">
                        Next <i class="fas fa-arrow-right"></i>
                    </button>
                    
                    <button 
                        v-else
                        class="btn btn-success" 
                        @click="confirmSubmitQuiz">
                        <i class="fas fa-check"></i> Submit Quiz
                    </button>
                </div>
            </div>

            <!-- Cancel Quiz Confirmation Modal -->
            <div v-if="showCancelModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Cancel Quiz</h5>
                            <button type="button" class="btn-close" @click="closeCancelModal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Are you sure you want to cancel this quiz?</strong></p>
                            <p class="text-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                Your progress will be lost and you'll return to the home page.
                            </p>
                            <p class="text-muted">
                                You have answered {{ getAnsweredCount() }} out of {{ totalQuestions }} questions.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeCancelModal">
                                Continue Quiz
                            </button>
                            <button type="button" class="btn btn-danger" @click="confirmCancel">
                                <i class="fas fa-times"></i> Yes, Cancel Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ✅ Submit Quiz Confirmation Modal -->
            <div v-if="showSubmitModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-check-circle text-success"></i> Submit Quiz
                            </h5>
                            <button type="button" class="btn-close" @click="closeSubmitModal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Are you ready to submit your quiz?</strong></p>
                            
                            <!-- Quiz Summary -->
                            <div class="alert alert-info">
                                <h6><i class="fas fa-info-circle"></i> Quiz Summary:</h6>
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted">Quiz Name:</small><br>
                                        <strong>{{ quiz.name }}</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Time Remaining:</small><br>
                                        <strong class="text-danger">{{ formatTime(remainingTime) }}</strong>
                                    </div>
                                </div>
                            </div>

                            <!-- Answer Statistics -->
                            <div class="row mb-3">
                                <div class="col-4 text-center">
                                    <div class="badge bg-success fs-6 p-2">
                                        <i class="fas fa-check"></i><br>
                                        {{ getAnsweredCount() }}<br>
                                        <small>Answered</small>
                                    </div>
                                </div>
                                <div class="col-4 text-center">
                                    <div class="badge bg-warning fs-6 p-2">
                                        <i class="fas fa-question"></i><br>
                                        {{ getUnansweredCount() }}<br>
                                        <small>Unanswered</small>
                                    </div>
                                </div>
                                <div class="col-4 text-center">
                                    <div class="badge bg-primary fs-6 p-2">
                                        <i class="fas fa-list"></i><br>
                                        {{ totalQuestions }}<br>
                                        <small>Total</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Warning for unanswered questions -->
                            <div v-if="getUnansweredCount() > 0" class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>Warning:</strong> You have {{ getUnansweredCount() }} unanswered question(s). 
                                These will be marked as incorrect.
                            </div>

                            <p class="text-muted">
                                <i class="fas fa-lock"></i>
                                Once submitted, you cannot change your answers.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeSubmitModal">
                                <i class="fas fa-edit"></i> Review Answers
                            </button>
                            <button type="button" class="btn btn-success" @click="submitQuiz">
                                <i class="fas fa-paper-plane"></i> Submit Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
