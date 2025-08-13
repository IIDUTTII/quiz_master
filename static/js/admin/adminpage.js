const AdminPage = {
    components: { NavBar },
    data() {
        return {
            adminNm: 'Admin',
            subjects: [],
            quizzes: [],
            chapters: [],
            selSubject: null,
            selQuiz: null,
            loading: true,
            chaptersLoading: false,
            err: null
        };
    },
    computed: {
        selectedType() {
            return this.selSubject ? "subject" : this.selQuiz ? "quiz" : null;
        },
        selectedData() {
            return this.selSubject || this.selQuiz || null;
        }
    },
    async mounted() {
        console.log('AdminPage mounted');
        await this.loadDash();
    },
    methods: {
        async loadDash() {
            this.loading = true;
            this.err = null;

            try {
                console.log('loading dashboard...');
                const resp = await fetch('/api/admin/dashboard');
                const data = await resp.json();
                console.log('dashboard data:', data);

                if (data.success) {
                    this.adminNm = data.admin_name || data.username || 'Admin';
                    this.subjects = Array.isArray(data.subjects) ? data.subjects : [];
                    this.quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
                    
                    console.log(`loaded ${this.subjects.length} subjects, ${this.quizzes.length} quizzes`);
                } else {
                    this.err = data.error || 'Failed to load dashboard';
                }
            } catch (error) {
                console.error('dashboard error:', error);
                this.err = 'Network error: ' + error.message;
            } finally {
                this.loading = false;
            }
        },

        selectSubject(subject) {
            this.selSubject = subject;
            this.selQuiz = null;
            this.chapters = [];
            this.fetchSubjectChapters(subject.id);
        },

        selectQuiz(quiz) {
            this.selQuiz = quiz;
            this.selSubject = null;
            this.chapters = [];
        },

        resetSelection() {
            this.selSubject = null;
            this.selQuiz = null;
            this.chapters = [];
        },

        async fetchSubjectChapters(subjectId) {
            this.chaptersLoading = true;
            try {
                const resp = await fetch(`/api/admin/subjects/${subjectId}/chapters`);
                if (resp.ok) {
                    this.chapters = await resp.json();
                } else {
                    this.chapters = [];
                }
            } catch (e) {
                console.warn('chapters load failed:', e);
                this.chapters = [];
            } finally {
                this.chaptersLoading = false;
            }
        },

        

        formatDate(dateStr) {
            if (!dateStr) return 'N/A';
            try {
                return new Date(dateStr).toLocaleDateString();
            } catch {
                return dateStr;
            }
        },

        // navigation methods
        createNewSubject() {
            this.$router.push('/admin/create-edit?form=subject');
        },
        createNewChapter() {
            this.$router.push('/admin/create-edit?form=chapter');
        },
        createNewQuiz() {
            this.$router.push('/admin/create-edit?form=quiz');
        },
        createNewQuestion() {
            this.$router.push('/admin/create-edit?form=question');
        },

        handleSearch(query) {
            this.$router.push({ path: '/admin/search', query: { q: query } });
        },

        async logout() {
            if (confirm('Sure to logout?')) {
                try {
                    const resp = await fetch('/admin_logout', { method: 'POST' });
                    const data = await resp.json();
                    this.$router.push(data.redirect || '/');
                } catch (error) {
                    this.$router.push('/');
                }
            }
        }
    },
    template: `
        <div>
            <NavBar 
                :user="adminNm" 
                userType="admin"
                @logout="logout"
                @search="handleSearch"/>

            <!-- Loading -->
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <!-- Error -->
            <div v-if="err" class="alert alert-danger mt-4 mx-4">
                {{ err }}
                <button type="button" class="btn-close" @click="err=null"></button>
            </div>

           

                <!-- Dashboard Stats -->
                <div v-if="!loading" class="row mb-4">
                    <div class="col-md-6">
                        <div class="card text-center bg-light">
                            <div class="card-body">
                                <h5>Total Subjects</h5>
                                <h3 class="text-success">{{ subjects.length }}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card text-center bg-light">
                            <div class="card-body">
                                <h5>Total Quizzes</h5>
                                <h3 class="text-warning">{{ quizzes.length }}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selection Dropdowns -->
                <div v-if="!loading" class="d-flex justify-content-center gap-3 mb-4">
                    <div class="dropdown">
                        <button class="btn btn-success dropdown-toggle" data-bs-toggle="dropdown">
                            {{ selSubject?.name || 'Select Subject' }}
                        </button>
                        <ul class="dropdown-menu">
                            <li v-if="subjects.length === 0">
                                <span class="dropdown-item-text text-muted">No subjects</span>
                            </li>
                            <li v-for="subject in subjects" :key="subject.id">
                                <a class="dropdown-item" href="#" @click.prevent="selectSubject(subject)">
                                    {{ subject.name }}
                                    <small class="d-block text-muted">{{ subject.description }}</small>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="dropdown">
                        <button class="btn btn-warning dropdown-toggle" data-bs-toggle="dropdown">
                            {{ selQuiz?.name || 'Select Quiz' }}
                        </button>
                        <ul class="dropdown-menu">
                            <li v-if="quizzes.length === 0">
                                <span class="dropdown-item-text text-muted">No quizzes</span>
                            </li>
                            <li v-for="quiz in quizzes" :key="quiz.id">
                                <a class="dropdown-item" href="#" @click.prevent="selectQuiz(quiz)">
                                    {{ quiz.name }}
                                    <small class="d-block text-muted">
                                        {{ formatDate(quiz.date_of_quiz) }} - {{ quiz.time_duration }}min
                                    </small>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <button class="btn btn-outline-secondary" @click="resetSelection">
                        Reset
                    </button>
                </div>

                <!-- Details Table -->
                <div v-if="!loading" class="table-container">
    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                {{ selectedType === 'subject' ? 'Subject Chapters' : 'Quiz Details' }}
            </h5>
            <div>
                <button v-if="selectedType === 'subject'" class="btn btn-success btn-sm me-2" @click="createNewSubject">
                    + Subject
                </button>
                <button v-if="selectedType === 'subject'" class="btn btn-success btn-sm" @click="createNewChapter">
                    + Chapter
                </button>
                <button v-if="selectedType === 'quiz'" class="btn btn-warning btn-sm me-2" @click="createNewQuiz">
                    + Quiz
                </button>
                <button v-if="selectedType === 'quiz'" class="btn btn-warning btn-sm" @click="createNewQuestion">
                    + Question
                </button>
            </div>
        </div>

        <div class="card-body table-responsive">
            <table v-if="selectedType === 'subject'" class="table table-bordered">
                <thead class="table-dark">
                    <tr>
                        <th>Chapter Name</th>
                        <th>No. of Questions</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="chaptersLoading">
                        <td colspan="3" class="text-center">
                            <div class="spinner-border spinner-border-sm"></div>
                        </td>
                    </tr>
                    <tr v-else-if="chapters.length === 0">
                        <td colspan="3" class="text-center text-muted">No chapters found.</td>
                    </tr>
                    <tr v-else v-for="chapter in chapters" :key="chapter.id">
                        <td>{{ chapter.name }}</td>
                        <td>{{ chapter.total_questions || 0 }}</td>
                        <td>{{ chapter.description }}</td>
                    </tr>
                </tbody>
            </table>

            <table v-else-if="selectedType === 'quiz'" class="table table-bordered">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Quiz Name</th>
                        <th>Date</th>
                        <th>Duration</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{ selectedData.id }}</td>
                        <td>{{ selectedData.name }}</td>
                         <td>{{ formatDate(selectedData.date_of_quiz) }}</td>
                        <td>{{ selectedData.time_duration }} minutes</td>
                        <td>{{ selectedData.description }}</td>
                    </tr>
                </tbody>
            </table>

            <div v-else class="text-center p-4">
                <p class="text-muted fs-5">Select a subject or quiz to view details.</p>
            </div>
        </div>
    </div>
</div>

    `
};
