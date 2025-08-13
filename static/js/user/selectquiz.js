const SelectQuizPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            chapterName: 'all',
            quizzes: [],
            chapters: [],
            selectedChapter: {},
            loading: false,
            error: null
        };
    },
    async mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        this.chapterName = urlParams.get('chapter_name') || 'all';
        await this.loadData();
    },
    methods: {
        async loadData() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch(`/user/select_quiz?chapter_name=${this.chapterName}`);
                const data = await response.json();
                
                if (data.success) {
                    this.quizzes = data.quizzes;
                    this.chapters = data.chapters;
                    this.selectedChapter = data.selected_chapter;
                } else {
                    this.error = data.message;
                }
            } catch (error) {
                this.error = 'Network error: ' + error.message;
            } finally {
                this.loading = false;
            }
        },

        selectChapter(chapterName) {
            this.chapterName = chapterName;
            this.loadData();
        }
    },
    template: `
        <div>
            <UNavBar 
                :user="'User'" 
                userType="user"
                @logout="() => $router.push('/')"
                @search="(query) => $router.push({ path: '/user/page/search', query: { q: query } })"/>
            
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-if="error" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ error }}
            </div>
            
            <div v-if="!loading && !error" class="container mt-4">
                <div class="row">
                    <div class="col-md-3">
                        <div class="card">
                            <div class="card-header">
                                <h5>Chapters</h5>
                            </div>
                            <div class="card-body">
                                <div class="list-group">
                                    <button 
                                        class="list-group-item list-group-item-action"
                                        :class="{ active: chapterName === 'all' }"
                                        @click="selectChapter('all')">
                                        All Chapters
                                    </button>
                                    <button 
                                        v-for="chapter in chapters" 
                                        :key="chapter.id"
                                        class="list-group-item list-group-item-action"
                                        :class="{ active: chapterName === chapter.name }"
                                        @click="selectChapter(chapter.name)">
                                        {{ chapter.name }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-9">
                        <h2>Available Quizzes</h2>
                        <p v-if="selectedChapter.name">Chapter: <strong>{{ selectedChapter.name }}</strong></p>
                        
                        <div v-if="quizzes.length === 0" class="text-center py-5">
                            <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                            <h4 class="text-muted">No Quizzes Available</h4>
                            <p class="text-muted">No quizzes available for this selection.</p>
                        </div>
                        
                        <div v-else class="row">
                            <div v-for="quiz in quizzes" :key="quiz.id" class="col-md-6 mb-4">
                                <div class="card h-100">
                                    <div class="card-body">
                                        <h5 class="card-title">{{ quiz.name }}</h5>
                                        <p class="card-text">{{ quiz.description || 'No description' }}</p>
                                        <p class="text-muted">
                                            <i class="fas fa-calendar"></i>
                                            {{ quiz.date_of_quiz }}
                                        </p>
                                    </div>
                                    <div class="card-footer">
                                        <button 
                                            class="btn btn-primary w-100"
                                            @click="$router.push({ path: '/user/take_quiz', query: { quiz_id: quiz.id } })">
                                            <i class="fas fa-play"></i> Start Quiz
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
