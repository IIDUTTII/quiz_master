const QuizScoresPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            user: { username: 'Loading...' },
            userScores: [],
            selectedScore: null,
            loading: false,
            error: null
        };
    },
    async mounted() {
        console.log('QuizScoresPage mounted');
        await this.loadScores();
    },
    methods: {
        async loadScores() {
            console.log('Loading scores...');
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch('/user/quiz_scores');
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', data);
                
                if (data.success) {
                    this.userScores = data.user_scores || [];
                    this.user = data.user || { username: 'User' };
                    console.log('Loaded scores:', this.userScores);
                } else {
                    this.error = data.message;
                    console.error('API Error:', data.message);
                }
            } catch (error) {
                console.error('Load scores error:', error);
                this.error = 'Network error: ' + error.message;
            } finally {
                this.loading = false;
            }
        },

        async viewDetails(score) {
            try {
                const response = await fetch(`/user/quiz_details?quiz_name=${encodeURIComponent(score.quiz_name)}`);
                const data = await response.json();
                
                if (data.success) {
                    this.selectedScore = {
                        ...score,
                        questions: data.questions,
                        answers: data.user_answers
                    };
                    const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
                    modal.show();
                } else {
                    alert('Error loading quiz details: ' + data.message);
                }
            } catch (error) {
                console.error('Error loading details:', error);
                alert('Error loading quiz details');
            }
        },

        getAnswerClass(userAnswer, correctAnswer) {
            return userAnswer == correctAnswer ? 'text-success' : 'text-danger';
        },

        logout() {
            console.log('User logged out');
            this.$router.push('/');
        },

        handleSearch(query) {
            this.$router.push({ path: '/user/page/search', query: { q: query } });
        }
    },
    template: `
        <div>
            <UNavBar 
                :user="user?.username || 'User'" 
                userType="user"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading scores...</span>
                </div>
            </div>

            <div v-if="error" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ error }}
                <button class="btn btn-secondary mt-2" @click="$router.push('/user/page')">
                    Back to Home
                </button>
            </div>
            
            <div v-if="!loading && !error" class="container mt-4">
                <h2>Your Quiz Scores</h2>
                
                <div v-if="userScores.length === 0" class="text-center py-5">
                    <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No Quiz Scores Available</h4>
                    <p class="text-muted">Start taking quizzes to see your scores here.</p>
                    <button class="btn btn-primary" @click="$router.push('/user/page')">
                        <i class="fas fa-play"></i> Take a Quiz
                    </button>
                </div>
                
                <div v-else class="card">
                    <div class="card-header">
                        <h4>Your Quiz Results</h4>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Quiz Name</th>
                                        <th>Score</th>
                                         <th>Percentage</th>
                                        <th>Time</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="score in userScores" :key="score.quiz_name">
                                        <td><strong>{{ score.quiz_name }}</strong></td>
                                        <td>{{ score.correct }}/{{ score.attempted }}</td>
                                        <td>
                                            <span 
                                                class="badge" 
                                                :class="score.percentage >= 70 ? 'bg-success' : score.percentage >= 50 ? 'bg-warning' : 'bg-danger'">
                                                {{ score.percentage }}%
                                            </span>
                                        </td>
                                        <td>{{ score.time }}</td>
                                        <td>
                                            <button 
                                                class="btn btn-sm btn-outline-primary" 
                                                @click="viewDetails(score)">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                           </div>
                    </div>
                </div>
            </div>

            <!-- Modal for Quiz Details -->
            <div class="modal fade" id="detailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                Quiz Details: {{ selectedScore?.quiz_name }}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div v-if="selectedScore">
                                <p><strong>Score:</strong> {{ selectedScore.correct }}/{{ selectedScore.attempted }} ({{ selectedScore.percentage }}%)</p>
                                <p><strong>Time:</strong> {{ selectedScore.time }}</p>
                                
                                <h6>Question Details:</h6>
                                <div v-for="(question, index) in selectedScore.questions" :key="question.id" class="mb-3">
                                    <div class="card">
                                        <div class="card-body">
                                            <h6>{{ index + 1 }}. {{ question.question }}</h6>
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <p class="mb-1" :class="getAnswerClass(selectedScore.answers[question.id], 1)">
                                                        1. {{ question.option1 }}
                                                    </p>
                                                    <p class="mb-1" :class="getAnswerClass(selectedScore.answers[question.id], 2)">
                                                        2. {{ question.option2 }}
                                                    </p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p class="mb-1" :class="getAnswerClass(selectedScore.answers[question.id], 3)">
                                                        3. {{ question.option3 }}
                                                    </p>
                                                    <p class="mb-1" :class="getAnswerClass(selectedScore.answers[question.id], 4)">
                                                        4. {{ question.option4 }}
                                                    </p>
                                                </div>
                                            </div>
                                            <div class="mt-2">
                                                <small>
                                                    <strong>Your Answer:</strong> {{ selectedScore.answers[question.id] || 'Not answered' }} |
                                                    <strong>Correct Answer:</strong> {{ question.correct_option }}
                                                </small>
                                            </div>
                                        </div>
                                       </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                   </div>
            </div>
        </div>
    `
};
