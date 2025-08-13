const CreateEditPage = {
    components: {
        NavBar
    },
    data() {
        return {
            adminNm: 'Loading...',
            formTyp: 'subject',
            editingItem: null,
            formData: {
                name: '',
                description: '',
                subject_id: '',
                chapter_id: '',
                quiz_id: '',
                date_of_quiz: '',
                time_duration: '',
                remarks: '',
                question: '',
                option1: '',
                option2: '',
                option3: '',
                option4: '',
                correct_option: 1
            },
            availSubj: [],
            availChap: [],
            availQuiz: [],
            isLoading: false,
            isSaving: false,
            err: null,
            success: null
        };
    },
    async mounted() {
        const routeQuery = this.$route.query;
        this.formTyp = routeQuery.form || 'subject';
        const editId = routeQuery.id;
        
        console.log('mounted with route params:', { 
            form: this.formTyp, 
            id: editId,
            routeQuery: routeQuery
        }); // debug
        
        await this.loadFormData();
        
        if (editId) {
            console.log('loading edit item with ID:', editId);
            await this.loadEditItem(parseInt(editId));
        }
    },
    methods: {
        async loadFormData() {
            this.isLoading = true;
            this.err = null;
            
            try {
                console.log(`loading form data for: ${this.formTyp}`);
                const resp = await fetch(`/api/admin/create_edit?form=${this.formTyp}`);
                const data = await resp.json();
                console.log('form data received:', data);
                
                if (data.success !== false) {
                    this.adminNm = data.admin_name || 'Admin';
                    this.availSubj = data.subjects || [];
                    this.availChap = data.chapters || [];
                    this.availQuiz = data.quizzes || [];
                    
                    if (data.edit_item) {
                        console.log('edit item found in loadFormData:', data.edit_item);
                        this.loadFormFromItem(data.edit_item);
                        this.editingItem = data.edit_item;
                    }
                } else {
                    this.err = data.message;
                }
            } catch (error) {
                console.error('Load form data error:', error);
                this.err = 'Network error: ' + error.message;
                this.adminNm = 'Admin';
            } finally {
                this.isLoading = false;
            }
        },

        async loadEditItem(itemId) {
            try {
                console.log(`fetching edit item - type: ${this.formTyp}, id: ${itemId}`);
                const resp = await fetch(`/api/admin/create_edit?form=${this.formTyp}&id=${itemId}`);
                const data = await resp.json();
                console.log('edit item response:', data);
                
                if (data.edit_item) {
                    this.loadFormFromItem(data.edit_item);
                    this.editingItem = data.edit_item;
                    console.log("edit item loaded successfully:", data.edit_item);
                } else {
                    console.error('no edit_item in response');
                    this.err = 'Item not found for editing';
                }
            } catch (error) {
                console.error('Load edit item error:', error);
                this.err = 'Error loading item for editing';
            }
        },

        loadFormFromItem(item) {
            console.log('loading form from item:', item);
            
            // reset form first
            this.resetForm();
            
            // basic fields
            this.formData.name = item.name || '';
            this.formData.description = item.description || '';
            this.formData.subject_id = item.subject_id || '';
            this.formData.chapter_id = item.chapter_id || '';
            this.formData.quiz_id = item.quiz_id || '';
            this.formData.remarks = item.remarks || '';
            
            if (item.date_of_quiz) {
                if (typeof item.date_of_quiz === 'string') {
                    this.formData.date_of_quiz = item.date_of_quiz.split('T')[0];
                } else {
                    this.formData.date_of_quiz = item.date_of_quiz;
                }
                console.log('date loaded:', this.formData.date_of_quiz);
            }
            
            if (item.time_duration) {
                this.formData.time_duration = item.time_duration;
                console.log('duration loaded:', this.formData.time_duration);
            }
            
            if (this.formTyp === 'question') {
                this.formData.question = item.question || '';
                this.formData.option1 = item.option1 || '';
                this.formData.option2 = item.option2 || '';
                this.formData.option3 = item.option3 || '';
                this.formData.option4 = item.option4 || '';
                this.formData.correct_option = item.correct_option || 1;
                console.log('question data loaded');
            }
            
            console.log('final form data:', this.formData);
        },

        changeFormType(newType) {
            if (newType !== this.formTyp) {
                this.formTyp = newType;
                this.resetForm();
                this.editingItem = null;
                this.$router.push({ path: '/admin/create-edit', query: { form: newType } });
            }
        },

        resetForm() {
            this.formData = {
                name: '',
                description: '',
                subject_id: '',
                chapter_id: '',
                quiz_id: '',
                date_of_quiz: '',
                time_duration: '',
                remarks: '',
                question: '',
                option1: '',
                option2: '',
                option3: '',
                option4: '',
                correct_option: 1
            };
            this.err = null;
            this.success = null;
        },

        async submitForm() {
            this.isSaving = true;
            this.err = null;
            this.success = null;
            
            try {
                const submitData = {
                    form_type: this.formTyp,
                    ...this.formData
                };
                
                if (this.editingItem) {
                    submitData.id = this.editingItem.id;
                }
                
                console.log("submitting form data:", submitData);
                
                const resp = await fetch('/api/admin/create_edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submitData)
                });
                
                const data = await resp.json();
                
                if (data.success) {
                    this.success = data.message;
                    if (!this.editingItem) {
                        this.resetForm();
                    }
                    await this.loadFormData();
                } else {
                    this.err = data.message || 'Save failed';
                }
            } catch (error) {
                console.error('Submit form error:', error);
                this.err = 'Network error: ' + error.message;
            } finally {
                this.isSaving = false;
            }
        },

        validateForm() {
            // For questions, check question field instead of name
            if (this.formTyp === 'question') {
                if (!this.formData.question.trim()) {
                    this.err = 'Question text is required';
                    return false;
                }
                if (!this.formData.quiz_id) {
                    this.err = 'Please select a quiz';
                    return false;
                }
                if (!this.formData.option1.trim() || !this.formData.option2.trim() || 
                    !this.formData.option3.trim() || !this.formData.option4.trim()) {
                    this.err = 'All four options are required';
                    return false;
                }
                return true;
            }
            
            // For other types (subject, chapter, quiz), check name field
            if (!this.formData.name.trim()) {
                this.err = 'Name is required';
                return false;
            }
            
            if (this.formTyp === 'chapter' && !this.formData.subject_id) {
                this.err = 'Please select a subject';
                return false;
            }
            
            if (this.formTyp === 'quiz' && !this.formData.chapter_id) {
                this.err = 'Please select a chapter';
                return false;
            }
            
            return true;
        },
        

        onSubmit() {
            if (this.validateForm()) {
                this.submitForm();
            }
        },

        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                try {
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
                } catch (error) {
                    console.error('Logout error:', error);
                    this.$router.push('/');
                }
            }
        },

        handleSearch(query) {
            this.$router.push({ path: '/admin/search', query: { q: query } });
        }
    },

    watch: {
        '$route'(to, from) {
            console.log('route changed:', to.query);
            if (to.query.form && to.query.form !== this.formTyp) {
                this.formTyp = to.query.form;
                this.resetForm();
                this.editingItem = null;
                this.loadFormData();
                
                if (to.query.id) {
                    this.loadEditItem(parseInt(to.query.id));
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
            
            <div v-if="isLoading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
            </div>

            <div v-if="success" class="alert alert-success mt-4 mx-4" role="alert">
                {{ success }}
            </div>
            
            <div v-if="!isLoading" class="container mt-4">
                <h2>{{ editingItem ? 'Edit' : 'Create' }} {{ formTyp.charAt(0).toUpperCase() + formTyp.slice(1) }}</h2>
                
                <!-- form type selector -->
                <div class="card mb-4">
                    <div class="card-header">
                        <div class="btn-group" role="group">
                            <button 
                                type="button" 
                                class="btn"
                                :class="formTyp === 'subject' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="changeFormType('subject')">
                                Subject
                            </button>
                            <button 
                                type="button" 
                                class="btn"
                                :class="formTyp === 'chapter' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="changeFormType('chapter')">
                                Chapter
                            </button>
                            <button 
                                type="button" 
                                class="btn"
                                :class="formTyp === 'quiz' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="changeFormType('quiz')">
                                Quiz
                            </button>
                            <button 
                                type="button" 
                                class="btn"
                                :class="formTyp === 'question' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="changeFormType('question')">
                                Question
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- form content -->
                <div class="card">
                    <div class="card-body">
                        <form @submit.prevent="onSubmit">
                            <!-- subject form -->
                            <div v-if="formTyp === 'subject'">
                                <div class="mb-3">
                                    <label for="subjectName" class="form-label">Subject Name</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="subjectName" 
                                        v-model="formData.name" 
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label for="subjectDesc" class="form-label">Description</label>
                                    <textarea 
                                        class="form-control" 
                                        id="subjectDesc" 
                                        rows="3"
                                        v-model="formData.description"></textarea>
                                </div>
                            </div>
                            
                            <!-- chapter form -->
                            <div v-if="formTyp === 'chapter'">
                                <div class="mb-3">
                                    <label for="chapterName" class="form-label">Chapter Name</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="chapterName" 
                                        v-model="formData.name" 
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label for="chapterSubject" class="form-label">Subject</label>
                                    <select 
                                        class="form-select" 
                                        id="chapterSubject" 
                                        v-model="formData.subject_id" 
                                        required>
                                        <option value="">Select a subject</option>
                                        <option v-for="subj in availSubj" :key="subj.id" :value="subj.id">
                                            {{ subj.name }}
                                        </option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="chapterDesc" class="form-label">Description</label>
                                    <textarea 
                                        class="form-control" 
                                        id="chapterDesc" 
                                        rows="3"
                                        v-model="formData.description"></textarea>
                                </div>
                            </div>
                            
                            <!-- quiz form  -->
                            <div v-if="formTyp === 'quiz'">
                                <div class="mb-3">
                                    <label for="quizName" class="form-label">Quiz Name</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="quizName" 
                                        v-model="formData.name" 
                                        required>
                                </div>
                                <div class="mb-3">
                                    <label for="quizChapter" class="form-label">Chapter</label>
                                    <select 
                                        class="form-select" 
                                        id="quizChapter" 
                                        v-model="formData.chapter_id" 
                                         required>
                                        <option value="">Select a chapter</option>
                                        <option v-for="chap in availChap" :key="chap.id" :value="chap.id">
                                            {{ chap.name }}
                                        </option>
                                    </select>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="quizDate" class="form-label">Quiz Date</label>
                                        <input 
                                            type="date" 
                                            class="form-control" 
                                            id="quizDate" 
                                            v-model="formData.date_of_quiz">
                                    </div>
                                    <div class="col-md-6">
                                        <label for="quizDuration" class="form-label">Duration (minutes)</label>
                                        <input 
                                            type="number" 
                                            class="form-control" 
                                            id="quizDuration" 
                                            v-model="formData.time_duration"
                                            min="1"
                                            max="300">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="quizDesc" class="form-label">Description</label>
                                    <textarea 
                                        class="form-control" 
                                        id="quizDesc" 
                                        rows="3"
                                        v-model="formData.description"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="quizRemarks" class="form-label">Remarks</label>
                                    <textarea 
                                        class="form-control" 
                                        id="quizRemarks" 
                                        rows="2"
                                        v-model="formData.remarks"></textarea>
                                </div>
                            </div>
                            
                            <!-- question form  -->
                            <div v-if="formTyp === 'question'">
                                <div class="mb-3">
                                    <label for="questionQuiz" class="form-label">Quiz</label>
                                    <select 
                                        class="form-select" 
                                        id="questionQuiz" 
                                        v-model="formData.quiz_id" 
                                        required>
                                        <option value="">Select a quiz</option>
                                        <option v-for="quiz in availQuiz" :key="quiz.id" :value="quiz.id">
                                            {{ quiz.name }}
                                        </option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="questionText" class="form-label">Question</label>
                                    <textarea 
                                        class="form-control" 
                                        id="questionText" 
                                        rows="3"
                                        v-model="formData.question" 
                                        required></textarea>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="option1" class="form-label">Option 1</label>
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="option1" 
                                            v-model="formData.option1" 
                                            required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="option2" class="form-label">Option 2</label>
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="option2" 
                                            v-model="formData.option2" 
                                            required>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="option3" class="form-label">Option 3</label>
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="option3" 
                                            v-model="formData.option3" 
                                            required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="option4" class="form-label">Option 4</label>
                                        <input 
                                            type="text" 
                                            class="form-control" 
                                            id="option4" 
                                            v-model="formData.option4" 
                                            required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="correctOption" class="form-label">Correct Answer</label>
                                    <select 
                                        class="form-select" 
                                        id="correctOption" 
                                        v-model="formData.correct_option" 
                                        required>
                                        <option :value="1">Option 1</option>
                                        <option :value="2">Option 2</option>
                                        <option :value="3">Option 3</option>
                                        <option :value="4">Option 4</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- submit button -->
                            <div class="d-flex gap-2">
                                <button 
                                    type="submit" 
                                    class="btn btn-primary"
                                    :disabled="isSaving">
                                    <span v-if="isSaving" class="spinner-border spinner-border-sm me-2"></span>
                                    {{ isSaving ? 'Saving...' : (editingItem ? 'Update ' + formTyp : 'Create ' + formTyp) }}
                                </button>
                                <button 
                                    type="button" 
                                    class="btn btn-secondary"
                                    @click="resetForm">
                                    Reset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `
};
