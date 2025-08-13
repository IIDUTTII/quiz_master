const HomePage = {
    mounted() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/static/css/home.css';
        document.head.appendChild(link);
        
        console.log('home page loaded');  // casual debug
    },
    
    methods: {
        goLogin() {
            console.log('user login clicked');
            this.$router.push('/user/login');
        },
        
        goAdminLogin() {
            console.log('admin login clicked'); 
            this.$router.push('/admin/login');
        },
        
        goRegister() {
            console.log('register clicked');
            this.$router.push('/register');
        }
    },
    
    template: `
    <div class="home-container">
        <!-- main hero section -->
        <div class="hero-section">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-lg-8 text-center">
                        <h1 class="display-4 mb-4">Quiz Master</h1>
                        <p class="lead mb-5">
                            Your go-to platform for subject-wise mock quizzes. 
                            Practice smart, build confidence, and ace your exams!
                        </p>
                        
                        <!-- login buttons -->
                        <div class="d-flex flex-column flex-md-row gap-3 justify-content-center mb-4">
                            <button class="btn btn-primary btn-lg px-4" @click="goLogin">
                                <i class="fas fa-user"></i> Student Login
                            </button>
                            
                            <button class="btn btn-success btn-lg px-4" @click="goAdminLogin">
                                <i class="fas fa-user-shield"></i> Admin Login
                            </button>
                            
                            <button class="btn btn-outline-primary btn-lg px-4" @click="goRegister">
                                <i class="fas fa-user-plus"></i> Register
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- features section -->
        <div class="py-5 bg-light">
            <div class="container">
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="text-center">
                            <i class="fas fa-clipboard-list fa-3x text-primary mb-3"></i>
                            <h4>Subject Quizzes</h4>
                            <p class="text-muted">Organized quizzes by subjects and chapters</p>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="text-center">
                            <i class="fas fa-chart-line fa-3x text-success mb-3"></i>
                            <h4>Track Progress</h4>
                            <p class="text-muted">See your performance with simple analytics</p>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="text-center">
                            <i class="fas fa-download fa-3x text-info mb-3"></i>
                            <h4>Export Data</h4>
                            <p class="text-muted">Download your quiz results and reports</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- footer section -->
        <footer class="footer-section bg-dark text-white py-4">
            <div class="container">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <h5>Quiz Master</h5>
                        <p class="text-muted">Your go-to platform for exam preparation and skill building.</p>
                    </div>
                    
                    <div class="col-md-3 mb-3">
                        <h6>Quick Links</h6>
                        <ul class="list-unstyled">
                            <li><a href="#" @click.prevent="goLogin" class="text-light">Student Login</a></li>
                            <li><a href="#" @click.prevent="goAdminLogin" class="text-light">Admin Login</a></li>
                            <li><a href="#" @click.prevent="goRegister" class="text-light">Register</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-md-3 mb-3">
                        <h6>Features</h6>
                        <ul class="list-unstyled">
                            <li class="text-muted">Subject Quizzes</li>
                            <li class="text-muted">Progress Tracking</li>
                            <li class="text-muted">Data Export</li>
                        </ul>
                    </div>
                </div>
                
                <hr class="border-secondary">
                
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <p class="mb-0 text-muted">&copy; 2025 Quiz Master. Made for students.</p>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <small class="text-muted">Simple. Smart. Effective.</small>
                    </div>
                </div>
            </div>
        </footer>
    </div>
`

};
