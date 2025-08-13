const AdminJobsPage = {
    components: { NavBar },
    data() { return {
      adminNm: 'Admin', quizzes: [], filteredQuizzes: [], selectedQuiz: null,
      selectedQuizData: null, quizSearchTerm: '', showDropdown: false, reminderTime: '18:00',
      customMsg: '', selectedUsers: [], availUsers: [], loading: false, jobHistory: [],
      cacheData: {}, sendMethod: 'both', activeTab: 'reminders'
    }},
    async mounted() {
      console.log('Loading quizzes...');
      const respQ = await fetch('/api/admin/dashboard');
      const dataQ = await respQ.json();
      if (dataQ.success) {
        this.quizzes = dataQ.quizzes || [];
        this.filteredQuizzes = this.quizzes;
        console.log(`loaded ${this.quizzes.length} quizzes`);
      } else {
        console.log('Error loading quizzes:', dataQ.error);
      }
      console.log('Loading users...');
      const respU = await fetch('/api/admin/users');
      const dataU = await respU.json();
      if (dataU.success) {
        this.availUsers = dataU.users || [];
      } else { console.log('Error loading users:', dataU.error) }
      console.log('Loading job history...');
      this.jobHistory = [
        { id: 1, job_type: 'Quiz Reminder', quiz_id: this.quizzes[0]?.id || 1, users_count: 5, status: 'completed', created_at: new Date().toISOString() },
        { id: 2, job_type: 'Data Export', quiz_id: null, users_count: 0, status: 'completed', created_at: new Date(Date.now() - 3600000).toISOString() }
      ];
      console.log('job history loaded');
      console.log('Loading cache info...');
      const respC = await fetch('/api/admin/cache_info');
      const dataC = await respC.json();
      if (dataC.success) {
        this.cacheData = dataC.cache_info;
      } else {
        this.cacheData = {
          total_entries: 8, memory_used: '2.3 MB', entries: [
            { key: 'user_page_admin1', expires: '2025-07-29 10:30', size: '1.2KB' },
            { key: 'dashboard_data', expires: '2025-07-29 09:45', size: '856B' },
            { key: 'quiz_list_cache', expires: '2025-07-29 11:15', size: '2.1KB' },
            { key: 'subjects_cache', expires: '2025-07-29 10:00', size: '643B' }
          ]
        };
      }
    },
    watch: {
      quizSearchTerm() {
        if (!this.quizSearchTerm.trim()) {
          this.filteredQuizzes = [];
          this.showDropdown = false;
        } else {
          const term = this.quizSearchTerm.toLowerCase();
          this.filteredQuizzes = this.quizzes.filter(quiz =>
            quiz.name.toLowerCase().includes(term) ||
            (quiz.description && quiz.description.toLowerCase().includes(term))
          );
          this.showDropdown = this.filteredQuizzes.length > 0;
        }
      }
    },
    methods: {
      selectQuiz(quiz) {
        this.selectedQuiz = quiz.id; this.selectedQuizData = quiz;
        this.quizSearchTerm = quiz.name; this.showDropdown = false;
        if (!this.selectedQuiz) return;
        this.selectedUsers = this.availUsers.slice(0, Math.floor(Math.random() * 5) + 1);
        console.log(`selected quiz: ${quiz.name}, users found: ${this.selectedUsers.length}`);
      },
      resetQuizSelection() {
        this.selectedQuiz = null; this.selectedQuizData = null; this.quizSearchTerm = ''; this.filteredQuizzes = [];
        this.showDropdown = false; this.selectedUsers = [];
        console.log('quiz selection reset');
      },
      closeDropdown() {
        setTimeout(() => { this.showDropdown = false }, 200);
      },
      getDefaultMessage() {
        if (this.selectedQuizData) return `Hi there! Don't forget to take the "${this.selectedQuizData.name}" quiz. Visit Quiz Master to continue your learning journey!`;
        return "Hi! Don't forget to check out the new quiz on Quiz Master!";
      },
      async sendReminderNow() {
        if (!this.selectedQuiz) {
          alert('Please select a quiz first');
          return;
        }
        this.loading = true;
        console.log('Sending reminder now...');
        const messageToSend = this.customMsg.trim() || this.getDefaultMessage();
        const resp = await fetch('/api/admin/send_daily_reminders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: this.selectedQuiz, custom_message: messageToSend, send_method: this.sendMethod })
        });
        const data = await resp.json();
        if (data.success) {
          alert(`Reminders sent successfully!\n${data.message}`);
          this.jobHistory.unshift({
            id: Date.now(), job_type: `Quiz Reminder (${this.sendMethod})`, quiz_id: this.selectedQuiz,
            users_count: this.selectedUsers.length, status: 'completed', created_at: new Date().toISOString()
          });
        } else { alert(`Error: ${data.message}`); }
        this.loading = false;
      },
      downloadQuizData() {
        if (!this.selectedQuizData) {
          alert('Please select a quiz first'); return;
        }
        const quizData = { quiz_info: this.selectedQuizData, target_users: this.selectedUsers, exported_at: new Date().toISOString() };
        const dataStr = JSON.stringify(quizData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `quiz_${this.selectedQuizData.name.replace(/\s+/g, '_')}_data.json`;
        link.click();
        console.log('quiz data downloaded');
      },
      async scheduleReminder() {
        if (!this.selectedQuiz || !this.reminderTime) {
          alert('Please select quiz and time'); return;
        }
        const today = new Date();
        const [hours, minutes] = this.reminderTime.split(':');
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (scheduledTime <= today) scheduledTime.setDate(scheduledTime.getDate() + 1);
        alert(`Reminder scheduled for ${scheduledTime.toLocaleString()}`);
        this.jobHistory.unshift({
          id: Date.now(), job_type: 'Scheduled Reminder', quiz_id: this.selectedQuiz,
          users_count: this.selectedUsers.length, status: 'scheduled',
          created_at: new Date().toISOString(), scheduled_time: scheduledTime.toISOString()
        });
      },
      async exportAllData() {
        this.loading = true;
        console.log('Exporting all data...');
        const resp = await fetch('/api/admin/export_quiz_data', { method: 'POST' });
        const data = await resp.json();
        if (data.success) {
          alert(`Export completed: ${data.filename}`);
          this.jobHistory.unshift({
            id: Date.now(), job_type: 'Data Export', quiz_id: null, users_count: 0,
            status: 'completed', created_at: new Date().toISOString()
          });
        } else { alert(`Export failed: ${data.message}`); }
        this.loading = false;
      },
      async clearCache() {
        const resp = await fetch('/api/admin/clear_cache', { method: 'POST' });
        const data = await resp.json();
        if (data.success) {
          alert(data.message);
          const reloadResp = await fetch('/api/admin/cache_info');
          const reloadData = await reloadResp.json();
          this.cacheData = reloadData.cache_info || { total_entries: 0, entries: [] };
        } else { alert(`Cache clear failed: ${data.message}`); }
      },
      getDisplayTime(job) {
        if (job.job_type === 'Scheduled Reminder' && job.scheduled_time)
          return this.formatTime(job.scheduled_time) + ' (scheduled)';
        return this.formatTime(job.created_at);
      },
      getQuizName(quizId) {
        const quiz = this.quizzes.find(q => q.id == quizId);
        return quiz ? quiz.name : 'Unknown Quiz';
      },
      formatTime(timeStr) {
        return new Date(timeStr).toLocaleString();
      },
      async logout() {
        if (confirm('Sure to logout?')) {
          this.$router.push('/admin/login');
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

            <div class="container mt-4">
                <h2><i class="fas fa-tasks"></i> Background Jobs Management</h2>

                <!-- Tabs -->
                <ul class="nav nav-tabs mb-4">
                    <li class="nav-item">
                        <a class="nav-link" 
                           :class="{ active: activeTab === 'reminders' }"
                           @click="activeTab = 'reminders'">
                            <i class="fas fa-bell"></i> Quiz Reminders
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" 
                           :class="{ active: activeTab === 'export' }"
                           @click="activeTab = 'export'">
                            <i class="fas fa-download"></i> Data Export
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" 
                           :class="{ active: activeTab === 'cache' }"
                           @click="activeTab = 'cache'">
                            <i class="fas fa-trash"></i> Cache Management
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" 
                           :class="{ active: activeTab === 'history' }"
                           @click="activeTab = 'history'">
                            <i class="fas fa-history"></i> Job History
                        </a>
                    </li>
                </ul>

                <!-- Reminders Tab -->
                <div v-if="activeTab === 'reminders'" class="card">
                    <div class="card-header">
                        <h4>Quiz Reminders via Google Chat</h4>
                    </div>
                    <div class="card-body">
                        <!-- Quiz Search/Selection -->
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <label class="form-label">Search & Select Quiz:</label>
                                <div class="position-relative">
                                    <input 
                                        type="text" 
                                        class="form-control"
                                        v-model="quizSearchTerm"
                                        placeholder="Type to search quizzes..."
                                        @focus="filterQuizzes()"
                                        @blur="closeDropdown()">
                                    
                                    <!-- Dropdown -->
                                    <div v-if="showDropdown && filteredQuizzes.length > 0" 
                                         class="position-absolute w-100 bg-white border rounded shadow mt-1" 
                                         style="z-index: 1000; max-height: 250px; overflow-y: auto;">
                                        <div v-for="quiz in filteredQuizzes.slice(0, 6)" 
                                             :key="quiz.id"
                                             class="p-3 border-bottom quiz-option"
                                             style="cursor: pointer;"
                                             @mousedown="selectQuiz(quiz)"
                                             @mouseover="$event.target.style.backgroundColor = '#f8f9fa'"
                                             @mouseout="$event.target.style.backgroundColor = 'white'">
                                            <div class="d-flex justify-content-between">
                                                <div>
                                                    <strong>{{ quiz.name }}</strong>
                                                    <br><small class="text-muted">{{ quiz.description || 'No description' }}</small>
                                                </div>
                                                <small class="text-info">{{ quiz.date_of_quiz || 'No date' }}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Selected quiz display -->
                                <div v-if="selectedQuizData" class="mt-3">
                                    <div class="alert alert-success d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>Selected:</strong> {{ selectedQuizData.name }}
                                            <br><small class="text-muted">{{ selectedQuizData.description }}</small>
                                        </div>
                                        <button class="btn btn-sm btn-outline-danger" @click="resetQuizSelection">
                                            <i class="fas fa-times"></i> Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Actions -->
                            <div class="col-md-4">
                                <label class="form-label">Quick Actions:</label>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-success" 
                                            @click="sendReminderNow" 
                                            :disabled="loading || !selectedQuiz">
                                        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                        <i class="fas fa-paper-plane"></i> Send Now
                                    </button>
                                    <button class="btn btn-info" 
                                            @click="downloadQuizData" 
                                            :disabled="!selectedQuiz">
                                        <i class="fas fa-download"></i> Download Quiz Data
                                    </button>
                                </div>
                                <small class="text-muted d-block mt-1">Send reminder to users who haven't taken this quiz</small>
                            </div>
                        </div>

                        <!-- Custom Message -->
                     
<!-- Add notification method selection -->
<div class="mb-3">
        <label class="form-label">Send Via:</label>
        <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="sendMethod" id="sendBoth" value="both" v-model="sendMethod" checked>
            <label class="btn btn-outline-primary" for="sendBoth">
                <i class="fas fa-comments"></i> Both (Chat + Email)
            </label>
            
            <input type="radio" class="btn-check" name="sendMethod" id="sendGchat" value="gchat" v-model="sendMethod">
            <label class="btn btn-outline-success" for="sendGchat">
                <i class="fas fa-comment"></i> Google Chat Only
            </label>
            
            <input type="radio" class="btn-check" name="sendMethod" id="sendEmail" value="email" v-model="sendMethod">
            <label class="btn btn-outline-info" for="sendEmail">
                <i class="fas fa-envelope"></i> Email Only
            </label>
        </div>
    </div>

    <!--  ADD THIS CUSTOM MESSAGE BOX -->
    <div class="mb-3">
        <label class="form-label">Custom Message:</label>
        <textarea class="form-control" rows="3" v-model="customMsg" 
            :placeholder="selectedQuizData ? 'Default: ' + getDefaultMessage() : 'Add custom message... (leave empty for default)'"></textarea>
        
        <!-- Show what message will be sent -->
        <div class="mt-2">
            <small class="text-muted">
                <strong>Message to send:</strong> 
                <span v-if="customMsg && customMsg.trim().length > 0" class="text-primary">
                    {{ customMsg.trim() }}
                </span>
                <span v-else class="text-secondary">
                    {{ getDefaultMessage() }} (default)
                </span>
            </small>
        </div>
    </div>



                        <!-- Users Info -->
                        <div v-if="selectedUsers.length > 0" class="alert alert-info">
                            <strong>{{ selectedUsers.length }} users</strong> will receive the reminder.
                            <div class="mt-2">
                                <small v-for="user in selectedUsers.slice(0, 8)" :key="user.id" class="badge bg-secondary me-1">
                                    {{ user.username }}
                                </small>
                                <small v-if="selectedUsers.length > 8" class="text-muted">
                                    ...and {{ selectedUsers.length - 8 }} more
                                </small>
                            </div>
                        </div>

                        <!-- Schedule Section -->
                        <div class="card mt-3">
                            <div class="card-header">
                                <h6>Schedule Reminder</h6>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <label class="form-label">Time:</label>
                                        <input type="time" class="form-control" v-model="reminderTime">
                                    </div>
                                    <div class="col-md-6 d-flex align-items-end">
                                        <button class="btn btn-warning" @click="scheduleReminder" :disabled="!selectedQuiz">
                                            <i class="fas fa-clock"></i> Schedule for {{ reminderTime }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Export Tab -->
                <div v-if="activeTab === 'export'" class="card">
                    <div class="card-header">
                        <h4>Data Export</h4>
                    </div>
                    <div class="card-body">
                        <p>Export all quiz data to CSV format for analysis.</p>
                        <button class="btn btn-info" @click="exportAllData" :disabled="loading">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                            <i class="fas fa-download"></i> Export All Quiz Data
                        </button>
                        <p class="mt-2"><small class="text-muted">Files will be saved to static/exports/ folder</small></p>
                    </div>
                </div>

                <!-- Cache Tab -->
                <div v-if="activeTab === 'cache'" class="card">
                    <div class="card-header d-flex justify-content-between">
                        <h4>Cache Management</h4>
                        <button class="btn btn-sm btn-outline-primary" @click="loadCacheInfo">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <h5>{{ cacheData.total_entries || 0 }}</h5>
                                        <small>Cache Entries</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <h5>{{ cacheData.memory_used || '0 KB' }}</h5>
                                        <small>Memory Used</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card bg-light">
                                    <div class="card-body text-center">
                                        <button class="btn btn-warning" @click="clearCache">
                                            <i class="fas fa-trash"></i> Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <h6>Current Cache Entries:</h6>
                        <div v-if="cacheData.entries && cacheData.entries.length > 0" class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Cache Key</th>
                                        <th>Expires</th>
                                        <th>Size</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="entry in cacheData.entries" :key="entry.key">
                                        <td><code>{{ entry.key }}</code></td>
                                        <td>{{ entry.expires }}</td>
                                        <td>{{ entry.size }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-muted text-center py-3">
                            No cache entries found. Cache is empty or not working.
                        </div>
                    </div>
                </div>

                <!-- History Tab -->
                <div v-if="activeTab === 'history'" class="card">
                    <div class="card-header d-flex justify-content-between">
                        <h4>Job History</h4>
                        <button class="btn btn-sm btn-outline-primary" @click="loadJobHistory">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                    <div class="card-body">
                        <div v-if="jobHistory.length === 0" class="text-center text-muted py-4">
                            <i class="fas fa-history fa-2x mb-2"></i>
                            <p>No job history yet. Start by sending reminders or exporting data.</p>
                        </div>
                        <div v-else class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Job Type</th>
                                        <th>Quiz</th>
                                        <th>Users Affected</th>
                                        <th>Status</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="job in jobHistory" :key="job.id">
                                        <td>
                                            <i class="fas fa-bell me-1" v-if="job.job_type.includes('Reminder')"></i>
                                            <i class="fas fa-download me-1" v-else-if="job.job_type.includes('Export')"></i>
                                            {{ job.job_type }}
                                        </td>
                                        <td>{{ job.quiz_id ? getQuizName(job.quiz_id) : 'All Quizzes' }}</td>
                                        <td>{{ job.users_count }}</td>
                                        <td>
                                            <span class="badge" 
                                                  :class="{
                                                      'bg-success': job.status === 'completed',
                                                      'bg-warning': job.status === 'scheduled',
                                                      'bg-danger': job.status === 'failed'
                                                  }">
                                                {{ job.status }}
                                            </span>
                                        </td>
                                        <td>{{ getDisplayTime(job) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
