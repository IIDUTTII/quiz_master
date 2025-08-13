const EditUsersPage = {
    components: { NavBar },
    data() {
        return {
            adminNm: 'Loading...',
            users: [],
            filteredUsers: [],
            searchQuery: '',
            selectedUser: null,
            userScores: [],
            isLoading: false,
            isLoadingScores: false,
            err: null,
            success: null,
            showDelModal: false,
            delUser: null,
            showScoresModal: false,
            totalUsers: 0,
            stats: {
                activeUsers: 0,
                totalAttempts: 0
            }
        };
    },
    async mounted() {
        await this.loadUsers();
    },
    methods: {
        async loadUsers() {
            this.isLoading = true;
            this.err = null;
            const resp = await fetch('/api/admin/users');
            const data = await resp.json();
            if (data.success) {
                this.adminNm = data.admin_name || 'Admin';
                this.users = data.users || [];
                this.totalUsers = data.total_users || 0;
                this.filteredUsers = this.users;
                this.stats.activeUsers = this.users.filter(u => u.total_attempts > 0).length;
                this.stats.totalAttempts = this.users.reduce((sum, u) => sum + u.total_attempts, 0);
            } else {
                this.err = data.error;
            }
            this.isLoading = false;
        },
        filterUsers() {
            if (!this.searchQuery.trim()) {
                this.filteredUsers = this.users;
                return;
            }
            const query = this.searchQuery.toLowerCase();
            this.filteredUsers = this.users.filter(user =>
                user.username.toLowerCase().includes(query) ||
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.id.toString().includes(query)
            );
        },
        async viewUserScores(user) {
            this.selectedUser = user;
            this.isLoadingScores = true;
            this.showScoresModal = true;
            this.userScores = [];
            const resp = await fetch(`/api/admin/users/${user.id}/scores`);
            const data = await resp.json();
            if (data.success) {
                this.userScores = data.scores || [];
            } else {
                this.err = data.error;
            }
            this.isLoadingScores = false;
        },
        closeScoresModal() {
            this.showScoresModal = false;
            this.selectedUser = null;
            this.userScores = [];
        },
        confirmDeleteUser(user) {
            this.delUser = user;
            this.showDelModal = true;
        },
        cancelDelete() {
            this.delUser = null;
            this.showDelModal = false;
        },
        async deleteUser() {
            if (!this.delUser) return;
            const resp = await fetch(`/api/admin/users/${this.delUser.id}`, {
                method: 'DELETE'
            });
            const data = await resp.json();
            if (data.success) {
                this.success = data.message;
                this.showDelModal = false;
                this.delUser = null;
                await this.loadUsers();
            } else {
                this.err = data.message;
            }
        },
        formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleString();
        },
        async logout() {
            if (confirm('Are you sure you want to logout?')) {
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
            }
        },
        handleSearch(query) {
            this.$router.push({ path: '/admin/search', query: { q: query } });
        }
    },
    watch: {
        searchQuery() {
            this.filterUsers();
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
                    <span class="visually-hidden">Loading users...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
            </div>

            <div v-if="success" class="alert alert-success mt-4 mx-4" role="alert">
                {{ success }}
            </div>
            
            <div v-if="!isLoading" class="container mt-4">
                <h2>User Management</h2>
                
                <!-- stats cards -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body text-center">
                                <h3>{{ totalUsers }}</h3>
                                <p class="mb-0">Total Users</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-success text-white">
                            <div class="card-body text-center">
                                <h3>{{ stats.activeUsers }}</h3>
                                <p class="mb-0">Active Users</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card bg-info text-white">
                            <div class="card-body text-center">
                                <h3>{{ stats.totalAttempts }}</h3>
                                <p class="mb-0">Total Quiz Attempts</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- search and filter -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <input 
                                    type="text" 
                                    class="form-control" 
                                    placeholder="Search users by name, username, email, or ID"
                                    v-model="searchQuery">
                            </div>
                            <div class="col-md-6">
                                <div class="text-end">
                                    <span class="text-muted">
                                        Showing {{ filteredUsers.length }} of {{ totalUsers }} users
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- users table -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Registered Users</h5>
                    </div>
                    <div class="card-body">
                        <div v-if="filteredUsers.length === 0" class="text-center py-4">
                            <i class="fas fa-users fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">{{ searchQuery ? 'No users found matching search criteria' : 'No users found' }}</h5>
                        </div>
                        
                        <div v-else class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead class="table-dark">
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Quiz Attempts</th>
                                        <th>Avg Score</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="user in filteredUsers" :key="user.id">
                                        <td>{{ user.id }}</td>
                                        <td><strong>{{ user.username }}</strong></td>
                                        <td>{{ user.name }}</td>
                                        <td>{{ user.email }}</td>
                                        <td>
                                            <span class="badge" :class="user.total_attempts > 0 ? 'bg-success' : 'bg-secondary'">
                                                {{ user.total_attempts }}
                                            </span>
                                        </td>
                                        <td>{{ user.avg_score.toFixed(1) }}</td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <!-- View Scores Button -->
<!-- View Scores Button -->
<button 
  class="btn btn-info btn-sm me-2" 
  @click="viewUserScores(user)"
  :disabled="user.total_attempts === 0">
  View Scores
</button>

<!-- Delete User Button -->
<button 
  class="btn btn-danger btn-sm" 
  @click="confirmDeleteUser(user)">
  Delete
</button>


                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- delete confirmation modal -->
            <div v-if="showDelModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Delete User</h5>
                            <button type="button" class="btn-close" @click="cancelDelete"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete this user?</p>
                            <p v-if="delUser"><strong>{{ delUser.name }} ({{ delUser.username }})</strong></p>
                            <div class="alert alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                This will also delete all quiz scores and data associated with this user.
                                This action cannot be undone.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="cancelDelete">Cancel</button>
                            <button type="button" class="btn btn-danger" @click="deleteUser">Delete User</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- user scores modal -->
            <div v-if="showScoresModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                Quiz Scores - {{ selectedUser?.name || 'User' }}
                            </h5>
                            <button type="button" class="btn-close" @click="closeScoresModal"></button>
                        </div>
                        <div class="modal-body">
                            <div v-if="isLoadingScores" class="text-center py-4">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Loading scores...</span>
                                </div>
                            </div>
                            
                            <div v-else-if="userScores.length === 0" class="text-center py-4">
                                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                <h6 class="text-muted">No quiz scores found</h6>
                            </div>
                            
                            <div v-else>
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>Quiz Name</th>
                                                <th>Score</th>
                                                <th>Date & Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="score in userScores" :key="score.id">
                                                <td>{{ score.quiz_name }}</td>
                                                <td>
                                                    <span class="badge" :class="score.total_scored >= 5 ? 'bg-success' : 'bg-warning'">
                                                        {{ score.total_scored }} pts
                                                    </span>
                                                </td>
                                                <td>{{ formatDate(score.timestamp) }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeScoresModal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
