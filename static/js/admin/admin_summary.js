const AdminSummaryPage = {
    components: {
        NavBar
    },
    data() {
        return {
            adminNm: 'Loading...',
            stats: {
                total_users: 0,
                total_quizzes: 0,
                total_attempts: 0
            },
            popQuizzes: [],
            activeUsers: [],
            recentAttempts: [],
            newUsers: [],
            charts: {
                quiz_chart: null,
                score_chart: null
            },
            isLoading: false,
            err: null
        };
    },
    async mounted() {
        await this.loadSummary();
    },
    methods: {
        async loadSummary() {
            this.isLoading = true;
            this.err = null;
            
            try {
                const resp = await fetch('/api/admin/summary');
                const data = await resp.json();
                
                if (data.success) {
                    this.adminNm = data.admin_name || 'Admin';
                    this.stats = data.stats || {};
                    this.popQuizzes = data.popular_quizzes || [];
                    this.activeUsers = data.active_users || [];
                    this.recentAttempts = data.recent_attempts || [];
                    this.newUsers = data.new_users || [];
                    this.charts = data.charts || {};
                } else {
                    this.err = data.error;
                }
            } catch (error) {
                console.error('Load summary error:', error);
                this.err = 'Network error: ' + error.message;
                this.adminNm = 'Admin';
            } finally {
                this.isLoading = false;
            }
        },

        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    const resp = await fetch('/admin_logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await resp.json();
                    
                    if (data.message) {
                        this.$router.push(data.redirect || '/');
                    } else {
                        this.$router.push('/');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    this.$router.push('/');
                }
            }
        },

        handleSearch(query) {
            this.$router.push({ path: '/admin/search', query: { q: query } });
        }
    },
    template: `
        <div>
            <NavBar 
                :user="adminNm" 
                userType="admin"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="isLoading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading summary...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
                <button class="btn btn-secondary mt-2" @click="loadSummary">
                    Retry
                </button>
            </div>
            
            <div v-if="!isLoading && !err" class="container mt-4">
                <h2>System Summary</h2>
                
                <!-- stats cards -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h3>{{ stats.total_users }}</h3>
                                <p class="mb-0">Total Users</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3>{{ stats.total_quizzes }}</h3>
                                <p class="mb-0">Total Quizzes</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3>{{ stats.total_attempts }}</h3>
                                <p class="mb-0">Total Attempts</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- charts -->
                <div class="row mb-4">
                    <div class="col-md-6" v-if="charts.quiz_chart">
                        <div class="card">
                            <div class="card-header">
                                <h5>Popular Quizzes</h5>
                            </div>
                            <div class="card-body text-center">
                                <img :src="'data:image/png;base64,' + charts.quiz_chart" 
                                     alt="Quiz Chart" 
                                     class="img-fluid">
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6" v-if="charts.score_chart">
                        <div class="card">
                            <div class="card-header">
                                <h5>Score Distribution</h5>
                            </div>
                            <div class="card-body text-center">
                                <img :src="'data:image/png;base64,' + charts.score_chart" 
                                     alt="Score Chart" 
                                     class="img-fluid">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Active Users</h5>
                            </div>
                            <div class="card-body">
                                <div v-if="activeUsers.length === 0" class="text-muted">
                                    No data available
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Attempts</th>
                                                <th>Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="user in activeUsers" :key="user.username">
                                                <td>{{ user.username }}</td>
                                                <td>{{ user.attempts }}</td>
                                                <td>{{ user.avg_score.toFixed(1) }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Popular Quizzes</h5>
                            </div>
                            <div class="card-body">
                                <div v-if="popQuizzes.length === 0" class="text-muted">
                                    No quiz data available
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Quiz</th>
                                                <th>Attempts</th>
                                                <th>Avg Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="quiz in popQuizzes" :key="quiz.name">
                                                <td>{{ quiz.name }}</td>
                                                <td>{{ quiz.attempts }}</td>
                                                <td>{{ quiz.avg_score.toFixed(1) }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>Recent Attempts</h5>
                            </div>
                            <div class="card-body">
                                <div v-if="recentAttempts.length === 0" class="text-muted">
                                    No data available
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Quiz</th>
                                                <th>Score</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="attempt in recentAttempts" :key="attempt.timestamp">
                                                <td>{{ attempt.username }}</td>
                                                <td>{{ attempt.quiz_name }}</td>
                                                <td>{{ attempt.score }} pts</td>
                                                <td>{{ attempt.timestamp }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card mb-4">
                            <div class="card-header">
                                <h5>New Users</h5>
                            </div>
                            <div class="card-body">
                                <div v-if="newUsers.length === 0" class="text-muted">
                                    No data available
                                </div>
                                <div v-else class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="user in newUsers" :key="user.id">
                                                <td>{{ user.username }}</td>
                                                <td>{{ user.email }}<br><small>ID: {{ user.id }}</small></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
