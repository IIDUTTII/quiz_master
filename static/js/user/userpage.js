const UserPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            user: { username: 'Loading...' },
            quizzes: [],
            subjects: [],
            chapters: [],
            filteredQuizzes: [],
            selectedSubj: 'all',
            selectedChap: 'all',
            loading: false,
            err: null,
            
            // profile modal stuff
            showProfile: false,
            profile: {
                username: '',
                name: '',
                email: '',
                profile_image: 'default-user.png'
            },
            editMode: false,
            profileLoading: false,
            profileErr: null,
            profileSuccess: null,
            

            uploadingImg: false,
            selectedFile: null,
            imgPreview: null
        };
    },
    async mounted() {
        await this.loadData();
    },
    methods: {
        async loadData() {
            this.loading = true;
            this.err = null;
            
            try {
                const response = await fetch('/user/page');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('user page data received:', data);
                
                if (data.success) {
                    this.user = data.user || { username: 'User' };
                    this.quizzes = data.quizzes || [];
                    this.subjects = data.subjects || [];
                    this.chapters = data.chapters || [];
                    this.filteredQuizzes = this.quizzes;
                    
                    console.log(`loaded ${this.quizzes.length} quizzes`);
                } else {
                    this.err = data.message;
                    if (data.redirect) {
                        this.$router.push(data.redirect);
                    }
                }
            } catch (error) {
                console.error('Load data error:', error);
                this.err = 'Network error: ' + error.message;
                this.user = { username: 'User' };
                this.quizzes = [];
                this.subjects = [];
                this.chapters = [];
                this.filteredQuizzes = [];
            } finally {
                this.loading = false;
            }
        },

        filterQuizzes() {
            console.log(`filtering by subject: ${this.selectedSubj}, chapter: ${this.selectedChap}`);
            
            let filtered = this.quizzes;
            
            if (this.selectedSubj !== 'all') {
                filtered = filtered.filter(quiz => {
                    const matches = quiz.subject_id == this.selectedSubj;
                    console.log(`quiz ${quiz.name}: subject_id=${quiz.subject_id}, matches=${matches}`);
                    return matches;
                });
            }
            
            if (this.selectedChap !== 'all') {
                filtered = filtered.filter(quiz => quiz.chapter_id == this.selectedChap);
            }
            
            this.filteredQuizzes = filtered;
            console.log(`filtered result: ${this.filteredQuizzes.length} quizzes`);
        },

        onSubjectChange() {
            console.log('subject changed to:', this.selectedSubj);
            this.selectedChap = 'all';
            this.filterQuizzes();
        },

        onChapterChange() {
            console.log('chapter changed to:', this.selectedChap);
            this.filterQuizzes();
        },

        getChaptersForSubject() {
            if (this.selectedSubj === 'all') {
                return this.chapters;
            }
            return this.chapters.filter(ch => ch.subject_id == this.selectedSubj);
        },

        takeQuiz(quizId) {
            if (quizId) {
                console.log('taking quiz:', quizId);
                this.$router.push({ path: '/user/take_quiz', query: { quiz_id: quizId } });
            } else {
                console.error('Quiz ID is missing');
            }
        },

  
        async openProfile() {
            console.log('opening profile modal');
            this.showProfile = true;
            await this.loadProfile();
        },

        closeProfile() {
            console.log('closing profile modal');
            this.showProfile = false;
            this.editMode = false;
            this.profileErr = null;
            this.profileSuccess = null;
            this.selectedFile = null;
            this.imgPreview = null;
        },

        async loadProfile() {
            this.profileLoading = true;
            this.profileErr = null;
            
            try {
                console.log('loading profile data');
                const resp = await fetch('/user/profile');
                const data = await resp.json();
                
                if (data.success) {
                    this.profile = data.profile;
                    console.log('profile loaded:', this.profile);
                } else {
                    this.profileErr = data.message;
                }
            } catch (error) {
                console.error('Load profile error:', error);
                this.profileErr = 'Network error: ' + error.message;
            } finally {
                this.profileLoading = false;
            }
        },

        toggleEdit() {
            this.editMode = !this.editMode;
            this.profileErr = null;
            this.profileSuccess = null;
            if (!this.editMode) {
                this.selectedFile = null;
                this.imgPreview = null;
            }
        },

        async saveProfile() {
            this.profileLoading = true;
            this.profileErr = null;
            this.profileSuccess = null;
            
            try {
                console.log('saving profile');
                const resp = await fetch('/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: this.profile.name,
                        email: this.profile.email
                    })
                });
                
                const data = await resp.json();
                
                if (data.success) {
                    this.profileSuccess = data.message;
                    this.editMode = false;
                    await this.loadProfile();
                } else {
                    this.profileErr = data.message;
                }
            } catch (error) {
                console.error('Save profile error:', error);
                this.profileErr = 'Network error: ' + error.message;
            } finally {
                this.profileLoading = false;
            }
        },


        onImageChange(event) {
            const file = event.target.files[0];
            if (file) {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    this.profileErr = 'Please select a valid image file (JPEG, PNG, GIF, WebP)';
                    return;
                }
                
                const maxSize = 5 * 1024 * 1024; // 5MB max
                if (file.size > maxSize) {
                    this.profileErr = 'Image file size must be less than 5MB';
                    return;
                }
                
                this.selectedFile = file;
                this.profileErr = null;
                
                // create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.imgPreview = e.target.result;
                };
                reader.readAsDataURL(file);
                
                console.log("image selected for preview");
            }
        },

        async uploadImage() {
            if (!this.selectedFile) {
                this.profileErr = 'Please select an image first';
                return;
            }
            
            this.uploadingImg = true;
            this.profileErr = null;
            
            try {
                const formData = new FormData();
                formData.append('profile_image', this.selectedFile);
                
                const resp = await fetch('/user/upload_profile_image', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await resp.json();
                
                if (data.success) {
                    this.profile.profile_image = data.filename;
                    this.profileSuccess = 'Profile image uploaded successfully!';
                    this.selectedFile = null;
                    this.imgPreview = null;
                    await this.loadProfile();
                } else {
                    this.profileErr = data.message || 'Image upload failed';
                }
            } catch (error) {
                console.error('Image upload error:', error);
                this.profileErr = 'Network error during upload: ' + error.message;
            } finally {
                this.uploadingImg = false;
            }
        },

        removeImage() {
            this.selectedFile = null;
            this.imgPreview = null;
            const input = document.getElementById('profileImageInput');
            if (input) input.value = '';
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
            this.$router.push({ path: '/user/page/search', query: { q: query } });
        }
    },
    template: `
        <div>
            <UNavBar 
                :user="user.username" 
                userType="user"
                @logout="logout"
                @search="handleSearch"
                @profile="openProfile"/>
            
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
            </div>
            
            <div v-if="!loading" class="container mt-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2>Available Quizzes</h2>
                    <!-- Profile button that works -->
                    <button class="btn btn-outline-primary btn-sm" @click="openProfile">
                        <i class="fas fa-user"></i> My Profile
                    </button>
                </div>
                
                <!-- Filter controls -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>Filter Quizzes</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="subjectFilter" class="form-label">Filter by Subject:</label>
                                <select 
                                    id="subjectFilter"
                                    class="form-select" 
                                    v-model="selectedSubj" 
                                    @change="onSubjectChange">
                                    <option value="all">All Subjects</option>
                                    <option v-for="subject in subjects" :key="subject.id" :value="subject.id">
                                        {{ subject.name }}
                                    </option>
                                </select>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <label for="chapterFilter" class="form-label">Filter by Chapter:</label>
                                <select 
                                    id="chapterFilter"
                                    class="form-select" 
                                    v-model="selectedChap" 
                                    @change="onChapterChange"
                                    :disabled="selectedSubj === 'all'">
                                    <option value="all">All Chapters</option>
                                    <option v-for="chapter in getChaptersForSubject()" :key="chapter.id" :value="chapter.id">
                                        {{ chapter.name }}
                                    </option>
                                </select>
                                <small v-if="selectedSubj === 'all'" class="text-muted">
                                    Select a subject first to filter by chapter
                                </small>
                            </div>
                        </div>
                        
                        <div class="alert alert-info" v-if="selectedSubj !== 'all' || selectedChap !== 'all'">
                            <small>
                                Showing {{ filteredQuizzes.length }} quiz(es)
                                <span v-if="selectedSubj !== 'all'">
                                    for subject: <strong>{{ subjects.find(s => s.id == selectedSubj)?.name }}</strong>
                                </span>
                                <span v-if="selectedChap !== 'all'">
                                    in chapter: <strong>{{ chapters.find(c => c.id == selectedChap)?.name }}</strong>
                                </span>
                            </small>
                        </div>
                    </div>
                </div>
                
                <!-- Quiz cards -->
                <div class="row">
                    <div v-if="filteredQuizzes.length === 0" class="col-12">
                        <div class="alert alert-warning text-center">
                            <i class="fas fa-info-circle"></i>
                            {{ selectedSubj === 'all' && selectedChap === 'all' ? 'No quizzes available.' : 'No quizzes found for the selected filters.' }}
                        </div>
                    </div>
                    
                    <div v-else v-for="quiz in filteredQuizzes" :key="quiz.id" class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100">
                            <div class="card-header bg-primary text-white">
                                <h5 class="card-title mb-0">{{ quiz.name }}</h5>
                            </div>
                            <div class="card-body d-flex flex-column">
                                <p class="card-text">{{ quiz.description || 'No description available' }}</p>
                                
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="fas fa-book"></i> {{ quiz.subject_name || 'Unknown Subject' }}
                                    </small>
                                </div>
                                
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="fas fa-bookmark"></i> {{ quiz.chapter_name || 'Unknown Chapter' }}
                                    </small>
                                </div>
                                
                                <div class="mb-3">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar"></i> {{ quiz.date_of_quiz || 'No date set' }}
                                    </small>
                                </div>
                                
                                <div class="mt-auto">
                                    <button 
                                        class="btn btn-success w-100" 
                                        @click="takeQuiz(quiz.id)">
                                        <i class="fas fa-play"></i> Take Quiz
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fixed Profile Image Upload -->
            <div v-if="showProfile" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user"></i> My Profile
                            </h5>
                            <button type="button" class="btn-close" @click="closeProfile"></button>
                        </div>
                        <div class="modal-body">
                            <div v-if="profileLoading" class="text-center">
                                <div class="spinner-border" role="status"></div>
                                <p>Loading profile...</p>
                            </div>

                            <div v-if="profileErr" class="alert alert-danger">
                                <i class="fas fa-exclamation-triangle"></i> {{ profileErr }}
                            </div>

                            <div v-if="profileSuccess" class="alert alert-success">
                                <i class="fas fa-check-circle"></i> {{ profileSuccess }}
                            </div>
                            
                            <div v-if="!profileLoading" class="row">
                                <!-- Profile Image Section -->
                                <div class="col-md-4 text-center mb-3">
                                    <div class="position-relative">
                                        <img 
                                            :src="imgPreview || '/static/images/profiles/' + profile.profile_image" 
                                            class="rounded-circle border"
                                            style="width: 150px; height: 150px; object-fit: cover;"
                                            alt="Profile Picture">
                                        
                                        <!-- Edit mode image upload -->
                                        <div v-if="editMode" class="mt-3">
                                            <input 
                                                type="file" 
                                                id="profileImageInput"
                                                class="form-control mb-2" 
                                                accept="image/*"
                                                @change="onImageChange">
                                            
                                            <div v-if="selectedFile" class="d-flex gap-2 justify-content-center">
                                                <button 
                                                    class="btn btn-success btn-sm" 
                                                    @click="uploadImage"
                                                    :disabled="uploadingImg">
                                                    <span v-if="uploadingImg" class="spinner-border spinner-border-sm me-1"></span>
                                                    <i class="fas fa-upload"></i> Upload
                                                </button>
                                                <button 
                                                    class="btn btn-secondary btn-sm" 
                                                    @click="removeImage">
                                                    <i class="fas fa-times"></i> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p class="mt-2 text-muted small">Profile Picture</p>
                                </div>
                                
                                <!-- Profile Info Section -->
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label class="form-label"><strong>Username:</strong></label>
                                        <p class="form-control-plaintext">{{ profile.username }}</p>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label"><strong>Name:</strong></label>
                                        <input 
                                            v-if="editMode"
                                            type="text" 
                                            class="form-control" 
                                            v-model="profile.name"
                                            placeholder="Enter your name">
                                        <p v-else class="form-control-plaintext">{{ profile.name || 'Not set' }}</p>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label"><strong>Email:</strong></label>
                                        <input 
                                            v-if="editMode"
                                            type="email" 
                                            class="form-control" 
                                            v-model="profile.email"
                                            placeholder="Enter your email">
                                        <p v-else class="form-control-plaintext">{{ profile.email || 'Not set' }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeProfile">
                                Close
                            </button>
                            <button 
                                v-if="!editMode" 
                                type="button" 
                                class="btn btn-primary" 
                                @click="toggleEdit">
                                <i class="fas fa-edit"></i> Edit Profile
                            </button>
                            <div v-else class="d-flex gap-2">
                                <button 
                                    type="button" 
                                    class="btn btn-success" 
                                    @click="saveProfile"
                                    :disabled="profileLoading">
                                    <span v-if="profileLoading" class="spinner-border spinner-border-sm me-2"></span>
                                    <i class="fas fa-save"></i> Save Changes
                                </button>
                                <button 
                                    type="button" 
                                    class="btn btn-secondary" 
                                    @click="toggleEdit">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
