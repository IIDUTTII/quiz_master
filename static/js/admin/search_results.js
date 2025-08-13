const SearchResultsPage = {
    components: { NavBar },
    data() {
        return {
            adminNm: 'Loading...',
            searchQuery: '',
            results: { users: [], subjects: [], quizzes: [], chapters: [] },
            totalResults: 0,
            isLoading: false,
            err: null
        };
    },
    async mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        this.searchQuery = urlParams.get('q') || '';
        if (this.searchQuery) {
            await this.performSearch();
        }
    },
    methods: {
        async performSearch(query = null) {
            const searchTerm = query || this.searchQuery;
            if (!searchTerm.trim()) {
                this.results = { users: [], subjects: [], quizzes: [], chapters: [] };
                this.totalResults = 0;
                return;
            }
            this.isLoading = true;
            this.err = null;
            try {
                const resp = await fetch(`/api/admin/search?q=${encodeURIComponent(searchTerm)}`);
                const data = await resp.json();
                if (data.success) {
                    this.adminNm = data.admin_name || 'Admin';
                    this.results = data.results || {};
                    this.totalResults = data.total_results || 0;
                } else {
                    this.err = data.error;
                }
            } catch (error) {
                console.error('Search error:', error);
                this.err = 'Network error: ' + error.message;
                this.adminNm = 'Admin';
            } finally {
                this.isLoading = false;
            }
        },
        truncateText(text, maxLen = 50) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
        },
        formatDate(dateStr) {
            if (!dateStr) return 'No date';
            try {
                return new Date(dateStr).toLocaleDateString();
            } catch {
                return dateStr;
            }
        },
        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    const resp = await fetch('/admin_logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
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
            this.searchQuery = query;
            this.performSearch(query);
            window.history.pushState({}, '', `?q=${encodeURIComponent(query)}`);
        }
    },
    template: `
<div>
    <NavBar 
        :user="adminNm" 
        userTyp="admin" 
        @search="handleSearch" 
        @logout="logout" 
    />
    
    <div class="container-fluid mt-4">
        <div class="row">
            <div class="col-12">
                <div class="card shadow-sm" v-if="searchQuery">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0">
                            <i class="fas fa-search me-2"></i>
                            {{ totalResults }} results found for "<strong>{{ searchQuery }}</strong>"
                        </h4>
                    </div>
                </div>

                <div v-if="!searchQuery" class="alert alert-info mt-3">
                    <i class="fas fa-info-circle me-2"></i>
                    Enter a search term in the navbar to find users, subjects, quizzes, or chapters
                </div>

                <div v-if="isLoading" class="text-center mt-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Searching...</span>
                    </div>
                    <p class="mt-2">Searching...</p>
                </div>

                <div v-if="err" class="alert alert-danger mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    {{ err }}
                </div>

                <div v-if="!isLoading && !err && searchQuery && totalResults === 0" class="alert alert-warning mt-3">
                    <i class="fas fa-search me-2"></i>
                    No items match "<strong>{{ searchQuery }}</strong>". Try different keywords.
                </div>

                <!-- Users Table -->
                <div v-if="results.users && results.users.length" class="card mt-4">
                    <div class="card-header bg-success text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-users me-2"></i>
                            Users ({{ results.users.length }})
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col">#ID</th>
                                        <th scope="col">Username</th>
                                        <th scope="col">Full Name</th>
                                        <th scope="col">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="user in results.users" :key="user.id">
                                        <td><span class="badge bg-secondary">{{ user.id }}</span></td>
                                        <td><strong>{{ user.username }}</strong></td>
                                        <td>{{ user.name }}</td>
                                        <td>{{ user.email }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Subjects Table -->
                <div v-if="results.subjects && results.subjects.length" class="card mt-4">
                    <div class="card-header bg-info text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-book me-2"></i>
                            Subjects ({{ results.subjects.length }})
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col">#ID</th>
                                        <th scope="col">Name</th>
                                        <th scope="col">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="subject in results.subjects" :key="subject.id">
                                        <td><span class="badge bg-secondary">{{ subject.id }}</span></td>
                                        <td><strong>{{ subject.name }}</strong></td>
                                        <td>{{ truncateText(subject.description, 60) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Quizzes Table -->
                <div v-if="results.quizzes && results.quizzes.length" class="card mt-4">
                    <div class="card-header bg-warning text-dark">
                        <h5 class="mb-0">
                            <i class="fas fa-question-circle me-2"></i>
                            Quizzes ({{ results.quizzes.length }})
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col">#ID</th>
                                        <th scope="col">Name</th>
                                        <th scope="col">Description</th>
                                        <th scope="col">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="quiz in results.quizzes" :key="quiz.id">
                                        <td><span class="badge bg-secondary">{{ quiz.id }}</span></td>
                                        <td><strong>{{ quiz.name }}</strong></td>
                                        <td>{{ truncateText(quiz.description, 50) }}</td>
                                        <td>
                                            <span class="badge bg-light text-dark">
                                                {{ formatDate(quiz.date_of_quiz) }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Chapters Table -->
                <div v-if="results.chapters && results.chapters.length" class="card mt-4">
                    <div class="card-header bg-secondary text-white">
                        <h5 class="mb-0">
                            <i class="fas fa-bookmark me-2"></i>
                            Chapters ({{ results.chapters.length }})
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th scope="col">#ID</th>
                                        <th scope="col">Name</th>
                                        <th scope="col">Description</th>
                                        <th scope="col">Subject ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="chapter in results.chapters" :key="chapter.id">
                                        <td><span class="badge bg-secondary">{{ chapter.id }}</span></td>
                                        <td><strong>{{ chapter.name }}</strong></td>
                                        <td>{{ truncateText(chapter.description, 50) }}</td>
                                        <td>
                                            <span class="badge bg-primary">{{ chapter.subject_id }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Summary Card -->
                <div v-if="totalResults > 0" class="card mt-4 mb-4">
                    <div class="card-body text-center">
                        <h6 class="card-title">
                            <i class="fas fa-chart-bar me-2"></i>
                            Search Summary
                        </h6>
                        <p class="card-text">
                            Found <strong>{{ totalResults }}</strong> result{{ totalResults !== 1 ? 's' : '' }} 
                            for "<em>{{ searchQuery }}</em>"
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`
};
