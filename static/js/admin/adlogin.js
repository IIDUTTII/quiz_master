const AdminLogin = {
    data() { return { usr: '', pwd: '', isLoading: false, err: null } },
    methods: {
      async login() {
        this.isLoading = true;
        this.err = null;
        const resp = await fetch('/admin/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.usr, password: this.pwd })
        });
        const data = await resp.json();
        console.log("login response:", data);
        if (data.message === "Login successful") {
          this.$router.push('/admin/page');
        } else {
          this.err = data.error || 'Login failed';
        }
        this.isLoading = false;
      }
    },
    template: `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header text-center">
                            <h3>Admin Login</h3>
                        </div>
                        <div class="card-body">
                            <div v-if="err" class="alert alert-danger">
                                {{ err }}
                            </div>
                            
                            <form @submit.prevent="login">
                                <div class="mb-3">
                                    <label for="username" class="form-label">Username</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="username" 
                                        v-model="usr" 
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input 
                                        type="password" 
                                        class="form-control" 
                                        id="password" 
                                        v-model="pwd" 
                                        required>
                                </div>
                                <button 
                                    type="submit" 
                                    class="btn btn-primary w-100" 
                                    :disabled="isLoading">
                                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ isLoading ? 'Logging in...' : 'Login' }}
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
