const RegisterPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            formData: {
                name: '',
                username: '',
                email: '',
                password: '',
                confirm_password: ''
            },
            errors: [],
            loading: false,
            success: false
        };
    },
    methods: {
        async submitForm() {
            this.loading = true;
            this.errors = [];
            this.success = false;
            
            // Client-side validation
            if (!this.validateForm()) {
                this.loading = false;
                return;
            }
            
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.success = true;
                    this.formData = {
                        name: '',
                        username: '',
                        email: '',
                        password: '',
                        confirm_password: ''
                    };
                    
                    // Redirect to login after successful registration
                    setTimeout(() => {
                        this.$router.push('/user/login');
                    }, 2000);
                } else {
                    this.errors = [data.message];
                }
            } catch (error) {
                console.error('Registration error:', error);
                this.errors = ['Network error. Please try again.'];
            } finally {
                this.loading = false;
            }
        },
        
        validateForm() {
            this.errors = [];
            
           
            if (!this.formData.name.trim()) {
                this.errors.push('Name is required');
            }
            
           
            if (!this.formData.username.trim()) {
                this.errors.push('Username is required');
            } else if (this.formData.username.length < 4 || this.formData.username.length > 15) {
                this.errors.push('Length of username should be between 4 to 15 characters');
            }
            
            
            if (!this.formData.email.trim()) {
                this.errors.push('Email is required');
            } else if (!this.isValidEmail(this.formData.email)) {
                this.errors.push('Please enter a valid email address');
            }
            
            
            if (!this.formData.password.trim()) {
                this.errors.push('Password is required');
            } else if (this.formData.password.length < 8 || this.formData.password.length > 20) {
                this.errors.push('Password length should be between 8 to 20 letters');
            }
            
          
            if (!this.formData.confirm_password.trim()) {
                this.errors.push('Please confirm your password');
            } else if (this.formData.password !== this.formData.confirm_password) {
                this.errors.push('Passwords do not match');
            }
            
            return this.errors.length === 0;
        },
        
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },
        
        goBack() {
            this.$router.push('/');
        },
        
        goToLogin() {
            this.$router.push('/user/login');
        }
    },
    template: `
        <div class="register-wrapper">
            <div class="register-box">
                <h1>Registration</h1>
                
                <!-- Error Messages -->
                <div v-if="errors.length > 0" class="alert-container">
                    <div v-for="error in errors" :key="error" class="alert alert-danger" role="alert">
                        {{ error }}
                    </div>
                </div>
                
                <!-- Success Message -->
                <div v-if="success" class="alert alert-success" role="alert">
                    User registered successfully! Redirecting to login...
                </div>
                
                <form @submit.prevent="submitForm">
                    <label for="name">Name</label>
                    <input 
                        type="text" 
                        id="name" 
                        v-model="formData.name" 
                        required 
                        :disabled="loading">
                    
                    <label for="username">Username</label>
                    <input 
                        type="text" 
                        id="username" 
                        v-model="formData.username" 
                        required 
                        :disabled="loading">
                    
                    <label for="email">Email</label>
                    <input 
                        type="email" 
                        id="email" 
                        v-model="formData.email" 
                        required 
                        :disabled="loading">
                    
                    <label for="password">Password</label>
                    <input 
                        type="password" 
                        id="password" 
                        v-model="formData.password" 
                        required 
                        :disabled="loading">
                    
                    <label for="confirm_password">Confirm Password</label>
                    <input 
                        type="password" 
                        id="confirm_password" 
                        v-model="formData.confirm_password" 
                        required 
                        :disabled="loading">
                    
                    <button type="submit" :disabled="loading">
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                        {{ loading ? 'Registering...' : 'Register' }}
                    </button>
                    
                    <p>Already have an account? <a href="#" @click.prevent="goToLogin">Login</a></p>
                    <p>cancel go back <a href="#" @click.prevent="goBack">Go back</a></p>
                </form>
            </div>
        </div>
    `
};
