const UserLoginPage = {
    data() {
        return {
            username: '',
            password: '',
            loading: false,
            error: null
        };
    },
    methods: {
        async login() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch('/user/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.$router.push('/user/page');
                } else {
                    this.error = data.message;
                }
            } catch (error) {
                this.error = 'Network error: ' + error.message;
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header text-center">
                            <h3>User Login</h3>
                        </div>
                        <div class="card-body">
                            <div v-if="error" class="alert alert-danger">
                                {{ error }}
                            </div>
                            
                            <form @submit.prevent="login">
                                <div class="mb-3">
                                    <label for="username" class="form-label">Username</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="username" 
                                        v-model="username" 
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input 
                                        type="password" 
                                        class="form-control" 
                                        id="password" 
                                        v-model="password" 
                                        required>
                                </div>
                                <button 
                                    type="submit" 
                                    class="btn btn-primary w-100" 
                                    :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ loading ? 'Logging in...' : 'Login' }}
                                </button>
                            </form>
                        </div>
                        <div class="card-footer text-center">
                            <small class="text-muted">
                                <router-link to="/">Back to Home</router-link>
                            </small>
                        </div>
                       </div>
                </div>
            </div>
        </div>
    `
};
