const AdminProfilePage = {
    components: { NavBar },
    data() {
        return {
            admin: {
                username: '',
                name: '',
                email: '',
                role: '',
                profile_image: 'default-admin.png',
                created_at: ''
            },
            editMd: false,
            isLoading: false,
            err: null,
            success: null,
            uploadingImg: false,
            selFile: null,
            imgPreview: null
        };
    },
    async mounted() {
        await this.loadProfile();
    },
    methods: {
        async loadProfile() {
            this.isLoading = true;
            this.err = null;
            const resp = await fetch('/admin/profile');
            const data = await resp.json();
            if (data.success) {
                this.admin = data.admin;
            } else {
                this.err = data.message;
            }
            this.isLoading = false;
        },
        async updateProfile() {
            this.isLoading = true;
            this.err = null;
            this.success = null;
            const resp = await fetch('/admin/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.admin.name,
                    email: this.admin.email,
                    profile_image: this.admin.profile_image
                })
            });
            const data = await resp.json();
            if (data.success) {
                this.success = data.message;
                this.editMd = false;
                await this.loadProfile();
            } else {
                this.err = data.message;
            }
            this.isLoading = false;
        },
        toggleEditMode() {
            this.editMd = !this.editMd;
            this.err = null;
            this.success = null;
            this.selFile = null;
            this.imgPreview = null;
        },
        cancelEdit() {
            this.editMd = false;
            this.selFile = null;
            this.imgPreview = null;
            this.loadProfile();
        },
        onImageChange(event) {
            const file = event.target.files[0];
            if (file) {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    this.err = 'Please select a valid image file (JPEG, PNG, GIF, WebP)';
                    return;
                }
                const maxSize = 5 * 1024 * 1024;
                if (file.size > maxSize) {
                    this.err = 'Image file size must be less than 5MB';
                    return;
                }
                this.selFile = file;
                this.err = null;
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.imgPreview = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },
        async uploadImage() {
            if (!this.selFile) {
                this.err = 'Please select an image first';
                return;
            }
            this.uploadingImg = true;
            this.err = null;
            const formData = new FormData();
            formData.append('profile_image', this.selFile);
            const resp = await fetch('/admin/upload_profile_image', {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                this.admin.profile_image = data.filename;
                this.success = 'Profile image uploaded successfully!';
                this.selFile = null;
                this.imgPreview = null;
                await this.updateProfile();
            } else {
                this.err = data.message || 'Image upload failed';
            }
            this.uploadingImg = false;
        },
        removeImage() {
            this.selFile = null;
            this.imgPreview = null;
            document.getElementById('profileImageInput').value = '';
        },
        async logout() {
            if (confirm('Are you sure you want to logout?')) {
                const resp = await fetch('/admin/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await resp.json();
                if (data.success) {
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
                :user="admin?.username || 'Admin'" 
                userType="admin"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="isLoading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading profile...</span>
                </div>
            </div>

            <div v-if="err" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ err }}
            </div>

            <div v-if="success" class="alert alert-success mt-4 mx-4" role="alert">
                {{ success }}
            </div>
            
            <div v-if="!isLoading" class="container mt-4">
                <h2>Admin Profile</h2>
                
                <div class="row">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Profile Information</h5>
                                <button 
                                    v-if="!editMd" 
                                    class="btn btn-primary btn-sm"
                                    @click="toggleEditMode">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                            <div class="card-body">
                                <div v-if="!editMd">
                                    <div class="row mb-3">
                                        <div class="col-sm-4"><strong>Username:</strong></div>
                                        <div class="col-sm-8">{{ admin.username }}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-4"><strong>Full Name:</strong></div>
                                        <div class="col-sm-8">{{ admin.name || 'Not set' }}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-4"><strong>Email:</strong></div>
                                        <div class="col-sm-8">{{ admin.email || 'Not set' }}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-4"><strong>Role:</strong></div>
                                        <div class="col-sm-8">{{ admin.role || 'Admin' }}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-4"><strong>Member Since:</strong></div>
                                        <div class="col-sm-8">{{ admin.created_at }}</div>
                                    </div>
                                </div>
                                
                                <div v-else>
                                    <form @submit.prevent="updateProfile">
                                        <div class="mb-3">
                                            <label for="name" class="form-label">Full Name</label>
                                            <input 
                                                type="text" 
                                                class="form-control" 
                                                id="name" 
                                                v-model="admin.name">
                                        </div>
                                        <div class="mb-3">
                                            <label for="email" class="form-label">Email</label>
                                            <input 
                                                type="email" 
                                                class="form-control" 
                                                id="email" 
                                                v-model="admin.email">
                                        </div>
                                        <div class="d-flex gap-2">
                                            <button 
                                                type="submit" 
                                                class="btn btn-success"
                                                :disabled="isLoading">
                                                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                                                Save Changes
                                            </button>
                                            <button 
                                                type="button" 
                                                class="btn btn-secondary"
                                                @click="cancelEdit">
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Profile Image</h5>
                            </div>
                            <div class="card-body text-center">
                                <div class="mb-3">
                                    <img 
                                        :src="imgPreview || (admin.profile_image ? '/static/images/profiles/' + admin.profile_image : '/static/images/default-admin.png')"
                                        alt="Profile Image" 
                                        class="img-fluid rounded-circle"
                                        style="width: 150px; height: 150px; object-fit: cover;">
                                </div>
                                
                                <div v-if="editMd">
                                    <div class="mb-3">
                                        <input 
                                            type="file" 
                                            class="form-control" 
                                            id="profileImageInput"
                                            accept="image/*"
                                            @change="onImageChange">
                                    </div>
                                    
                                    <div v-if="selFile" class="d-flex gap-2 justify-content-center">
                                        <button 
                                            class="btn btn-success btn-sm"
                                            @click="uploadImage"
                                            :disabled="uploadingImg">
                                            <span v-if="uploadingImg" class="spinner-border spinner-border-sm me-1"></span>
                                            {{ uploadingImg ? 'Uploading...' : 'Upload' }}
                                        </button>
                                        <button 
                                            class="btn btn-secondary btn-sm"
                                            @click="removeImage">
                                            Remove
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
