const UNavBar = {
    props: {
        user: {
            type: String,
            default: "User"
        },
        userType: {
            type: String,
            default: "user"
        }
    },
    data() {
        return {
            searchQuery: "",
            userImg: 'default-user.png'  
        };
    },
    async mounted() {
        await this.loadUserImg();
    },
    methods: {
        
        async loadUserImg() {
            try {
                const resp = await fetch('/user/profile');
                const data = await resp.json();
                if (data.success && data.profile.profile_image) {
                    this.userImg = data.profile.profile_image;
                }
            } catch (e) {
                console.log('no profile img available');  // casual debug
            }
        },

        navigate(path) {
            console.log('Navigating to:', path);
            this.$router.push(path);
        },

        performSearch() {
            if (this.searchQuery.trim()) {
                this.$router.push({
                    path: '/user/page/search',
                    query: { q: this.searchQuery.trim() }
                });
                this.$emit('search', this.searchQuery.trim());
            }
        },

        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    const response = await fetch('/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        console.log('Logout successful, redirecting to:', data.redirect);
                        this.$router.push(data.redirect || '/');
                    } else {
                        console.error('Logout failed:', data.message);
                        this.$router.push('/');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    this.$router.push('/');
                }
            }
        }
    },
    emits: ['logout', 'search', 'profile'],
    template: `
        <nav class="navbar navbar-dark bg-dark navbar-expand-lg">
            <div class="container-fluid">
                <!-- Profile image + usernam -->
                <a class="navbar-brand d-flex align-items-center" href="#" @click.prevent="$emit('profile')">
                    <img 
                        :src="'/static/images/profiles/' + userImg" 
                        class="rounded-circle me-2"
                        style="width: 35px; height: 35px; object-fit: cover; border: 2px solid #007bff;"
                        alt="Profile"
                        @error="userImg = 'default-user.png'">
                    <span>{{ user }}</span>
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="#" @click.prevent="navigate('/user/page')">
                                <i class="fas fa-home"></i> Home
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" @click.prevent="navigate('/user/quiz_scores')">
                                <i class="fas fa-chart-bar"></i> My Scores
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" @click.prevent="navigate('/user/summary')">
                                <i class="fas fa-chart-line"></i> Summary
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#" @click.prevent="$emit('profile')">
                                <button class="nav-btn profile-btn" @click="$emit('profile')">Profile</button>
                            </a>
                        </li>
                    </ul>
                    
                    <form class="d-flex me-3" @submit.prevent="performSearch">
                        <input 
                            class="form-control me-2" 
                            type="search" 
                            placeholder="Search..." 
                            v-model="searchQuery">
                        <button class="btn btn-outline-light" type="submit">
                            <i class="fas fa-search"></i>
                        </button>
                    </form>
                    
                    <button class="btn btn-outline-danger btn-sm" @click="logout">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
        </nav>
    `
};
