const DatabasePage = {
    components: { NavBar },
    data() {
        return {
            adminNm: 'Loading...',
            selectedTyp: 'subject',
            items: [],
            isLoading: false,
            err: null,
            success: null,
            showDelModal: false,
            delItem: null
        };
    },
    async mounted() {
        await this.loadData();
    },
    methods: {
        async loadData() {
            this.isLoading = true;
            this.err = null;
            const resp = await fetch(`/api/admin/database?page=${this.selectedTyp}`);
            const data = await resp.json();
            if (data.success) {
                this.adminNm = data.admin_name || 'Admin';
                this.items = data.selected || [];
            } else {
                this.err = data.message;
            }
            this.isLoading = false;
        },
        async changeType(newType) {
            if (newType !== this.selectedTyp) {
                this.selectedTyp = newType;
                this.items = [];
                await this.loadData();
            }
        },
        editItem(item) {
            this.$router.push({
                path: '/admin/create-edit',
                query: { form: this.selectedTyp, id: item.id }
            });
        },
        createNewItem() {
            this.$router.push({
                path: '/admin/create-edit',
                query: { form: this.selectedTyp }
            });
        },
        confirmDelete(item) {
            this.delItem = item;
            this.showDelModal = true;
        },
        cancelDelete() {
            this.delItem = null;
            this.showDelModal = false;
        },
        async deleteItem() {
            if (!this.delItem) return;
            const resp = await fetch(`/api/admin/${this.selectedTyp}/${this.delItem.id}`, {
                method: 'DELETE'
            });
            const data = await resp.json();
            if (data.success) {
                this.success = data.message;
                this.showDelModal = false;
                this.delItem = null;
                await this.loadData();
            } else {
                this.err = data.message;
            }
        },
        truncateText(text, maxLen = 50) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
        },
        getCorrectAnswer(item) {
            return item.correct_option || 'N/A';
        },
        formatDate(dateStr) {
            if (!dateStr) return 'Not set';
            return new Date(dateStr).toLocaleDateString();
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


    template: `
        <div>
            <NavBar 
                :user="adminNm" 
                userType="admin"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="isLoading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading database...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
            </div>

            <div v-if="success" class="alert alert-success mt-4 mx-4" role="alert">
                {{ success }}
            </div>
            
            <div v-if="!isLoading" class="container mt-4">
                <h2>Database Management</h2>
                
                <!-- type selector buttons like in your HTML -->
                <div class="mb-3">
                    <button 
                        class="btn me-2"
                        :class="selectedTyp === 'subject' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="changeType('subject')">
                        Subject Table
                    </button>
                    <button 
                        class="btn me-2"
                        :class="selectedTyp === 'chapter' ? 'btn-primary' : 'btn-outline-primary'"
                        @click="changeType('chapter')">
                        Chapter Table
                    </button>
                    <button 
                        class="btn me-2"
                        :class="selectedTyp === 'quiz' ? 'btn-dark' : 'btn-outline-dark'"
                        @click="changeType('quiz')">
                        Quiz Table
                    </button>
                    <button 
                        class="btn me-2"
                        :class="selectedTyp === 'question' ? 'btn-dark' : 'btn-outline-dark'"
                        @click="changeType('question')">
                        Question Table
                    </button>
                </div>
                
                <!-- data table matching your HTML structure -->
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">{{ selectedTyp.charAt(0).toUpperCase() + selectedTyp.slice(1) }} Management</h5>
                        <button class="btn btn-success btn-sm" @click="createNewItem">
                            <i class="fas fa-plus"></i> Add New {{ selectedTyp }}
                        </button>
                    </div>
                    <div class="card-body">
                        <div v-if="items.length === 0" class="text-center py-4">
                            <p style="color:rgb(13, 112, 30);">Load Data By Clicking on Button.</p>
                        </div>
                        
                        <div v-else class="table-responsive">
                            <!-- subjects table -->
                            <table v-if="selectedTyp === 'subject'" class="table table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Subject id</th>
                                        <th>Name</th>
                                        <th>Description</th>
                                        
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id">
                                        <td>{{ item.id }}</td>
                                        <td>{{ item.name }}</td>
                                        <td>{{ item.description }}</td>
                                      
                                        <td>
                                            <button 
                                                class="btn btn-danger btn-sm me-2" 
                                                @click="confirmDelete(item)"
                                                title="Delete">
                                                Delete
                                            </button>
                                            <button 
                                                class="btn btn-warning btn-sm" 
                                                @click="editItem(item)"
                                                title="Edit">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <!-- chapters table -->
                            <table v-if="selectedTyp === 'chapter'" class="table table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>chapter id</th>
                                        <th>Chapter Name</th>
                                        <th>Description</th>
                                       
                                        <th>foreign id</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id">
                                        <td>{{ item.id }}</td>
                                        <td>{{ item.name }}</td>
                                        <td>{{ item.description }}</td>
                                        
                                        <td>{{ item.subject_id }}</td>
                                        <td>
                                            <button 
                                                class="btn btn-danger btn-sm me-2" 
                                                @click="confirmDelete(item)">
                                                Delete
                                            </button>
                                            <button 
                                                class="btn btn-warning btn-sm" 
                                                @click="editItem(item)">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <!-- quizzes table -->
                            <table v-if="selectedTyp === 'quiz'" class="table table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>ID</th>
                                        <th>Quiz Name</th>
                                        <th>Date</th>
                                        <th>Duration</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id">
                                        <td>{{ item.id }}</td>
                                        <td>{{ item.name }}</td>
                                        <td>{{ formatDate(item.date_of_quiz) }}</td>
                                        <td>{{ item.time_duration || 'Not set' }}</td>
                                        <td>{{ item.description }}</td>
                                        <td>
                                            <button 
                                                class="btn btn-danger btn-sm me-2" 
                                                @click="confirmDelete(item)">
                                                Delete
                                            </button>
                                            <button 
                                                class="btn btn-warning btn-sm" 
                                                @click="editItem(item)">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <!-- questions table -->
                            <table v-if="selectedTyp === 'question'" class="table table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th>ID</th>
                                        <th>Question</th>
                                        <th>Answer</th>
                                        <th>Chapter</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id">
                                        <td>{{ item.id }}</td>
                                        <td>{{ truncateText(item.question, 50) }}</td>
                                        <td>{{ getCorrectAnswer(item) }}</td>
                                        <td>{{ item.quiz_id }}</td>
                                        <td>
                                            <button 
                                                class="btn btn-danger btn-sm me-2" 
                                                @click="confirmDelete(item)">
                                                Delete
                                            </button>
                                            <button 
                                                class="btn btn-warning btn-sm" 
                                                @click="editItem(item)">
                                                Edit
                                            </button>
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
                            <h5 class="modal-title">Confirm Delete</h5>
                            <button type="button" class="btn-close" @click="cancelDelete"></button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete this {{ selectedTyp }}?</p>
                            <p v-if="delItem"><strong>{{ delItem.name || delItem.question || 'Item' }}</strong></p>
                            <p class="text-danger">This action cannot be undone.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="cancelDelete">Cancel</button>
                            <button type="button" class="btn btn-danger" @click="deleteItem">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
