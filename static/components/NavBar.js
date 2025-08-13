const NavBar = {
    props: {
        user: {
            type: String,
            default: "User"
        },
        userType: {
            type: String,
            default: "admin"
        },
        profileImage: {
            type: String,
            default: "default-admin.png"
        }
    },
    template: `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container">
                <!-- Profile Photo + Username -->
                <a class="navbar-brand d-flex align-items-center" @click="navigate('/admin/profile')" style="cursor: pointer;">
                    <img 
                        :src="'/static/images/profiles/' + profileImage" 
                        :alt="user + ' Profile'"
                        class="profile-nav-image rounded-circle me-2"
                        style="width: 40px; height: 40px; object-fit: cover; border: 2px solid #ffffff;"
                        @error="$event.target.src='/static/images/profiles/default-admin.png'">
                    <span>{{ user }}</span>
                </a>
                
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/page')">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/create-edit')">Create</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/database')">DB</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/summary')">Summary</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/users')">Users</a>
                        </li>
                        <li class="nav-item">
    <a class="nav-link" @click="navigate('/admin/jobs')">
        <i class="fas fa-tasks"></i> Jobs
    </a>
</li>

                        <li class="nav-item">
                            <a class="nav-link" @click="navigate('/admin/profile')">Profile</a>
                        </li>
                    </ul>
                    
                    <!-- Search Form -->
                    <form class="d-flex me-3" @submit.prevent="performSearch">
                        <div class="input-group">
                            <input 
                                type="search" 
                                class="form-control" 
                                placeholder="Search..." 
                                v-model="searchQuery"
                                style="min-width: 200px;">
                            <button class="btn btn-outline-light" type="submit" :disabled="!searchQuery.trim()">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </form>
                    
                    <ul class="navbar-nav">
                        <li class="nav-item">
                            <button class="btn btn-outline-light" @click="logout">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `,
    data() {
        return {
            searchQuery: ""
        };
    },
    emits: ['logout', 'search'],
    methods: {
        navigate(path) {
            this.$router.push(path);
        },
        performSearch() {
            if (this.searchQuery.trim()) {
                this.$router.push({
                    path: '/admin/search',
                    query: { q: this.searchQuery.trim() }
                });
                this.$emit('search', this.searchQuery.trim());
            }
        },
        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    const response = await fetch('/admin/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        this.$router.push(data.redirect || '/');
                    } else {
                        this.$router.push('/');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    this.$router.push('/');
                }
            }
        }
    }
};
