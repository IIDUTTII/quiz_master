const UserSummaryPage = {
    components: {
        UNavBar
    },
    data() {
        return {
            user: { username: 'Loading...' },
            summary: {},
            loading: false,
            error: null,
            loadingReport: false,
            loadingExport: false,
            activeu: [],         
            lastexpo: null,      
            notiSetting: {
                dailyRem: true,
                reminderTime: '18:00',
                emailNoti: true,
                weeklyReport: false
            }
        };
    },
    async mounted() {
        await this.loadSummary();
        await this.loadNotificationSettings();
    },
    methods: {
        async loadSummary() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch('/user/summary');
                const data = await response.json();
                
                if (data.success) {
                    if (data.no_data) {
                        this.summary = { no_data: true };
                    } else {
                        this.summary = data;
                        this.user = { username: 'User' };
                    }
                } else {
                    this.error = data.message;
                }
            } catch (error) {
                console.error('Load summary error:', error);
                this.error = 'Network error: ' + error.message;
                console.log("test") // debug line
                this.user = { username: 'User' };
            } finally {
                this.loading = false;
            }
        },
        
        async loadNotificationSettings() {
            try {
                const response = await fetch('/user/notification_settings');
                const data = await response.json();
                
                if (data.success) {
                    this.notiSetting = {
                        ...this.notiSetting,
                        ...data.settings
                    };
                    console.log('settings loaded:', data.settings);
                } else {
                    console.error('Failed to load settings:', data.message);
                }
            } catch (error) {
                console.error('Error loading notification settings:', error);
                // just use defaults if this fails
            }
        },
        
        logout() {
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = '/logout';
            }
        },
        
        handleSearch(query) {
            this.$router.push({ path: '/user/page/search', query: { q: query } });
        },
        
        async saveNotificationSettings() {
            try {
                const response = await fetch('/user/notification_settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.notiSetting)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Notification settings saved successfully!');
                } else {
                    alert('Error saving settings: ' + data.message);
                }
            } catch (error) {
                console.error('Error saving notification settings:', error);
                alert('Network error: ' + error.message);
            }
        },
        
        async requestMonthlyReport(format) {
            try {
                this.loadingReport = true;
                
                const response = await fetch(`/user/request_monthly_report?format=${format}`);
                const data = await response.json();
                
                if (data.success) {
                    if (data.task_id) {
                        alert(`Monthly report (${format.toUpperCase()}) is being generated! Task ID: ${data.task_id}\nYou will receive it via email shortly.`);
                        this.pollTaskStatus(data.task_id, 'monthly_report');
                    } else {
                        alert(`Monthly report requested successfully! Check your email for the ${format.toUpperCase()} file.`);
                    }
                } else {
                    alert('Error requesting report: ' + data.message);
                }
            } catch (error) {
                console.error('Error requesting monthly report:', error);
                alert('Network error: ' + error.message);
            } finally {
                this.loadingReport = false;
            }
        },
        
        async pollTaskStatus(taskId, taskType) {
            const maxAttempts = 30;
            let attempts = 0;
            
            console.log(`starting to poll task ${taskId} of type ${taskType}`);
            
            const pollInterval = setInterval(async () => {
                attempts++;
                
                try {
                    const response = await fetch(`/user/task_status/${taskId}`);
                    const data = await response.json();
                    
                    console.log(`task ${taskId} status: ${data.status} (attempt ${attempts})`);
                    
                    if (data.status === 'SUCCESS') {
                        clearInterval(pollInterval);
                        this.showTaskSuccess(taskType, data.result);
                    } else if (data.status === 'FAILURE') {
                        clearInterval(pollInterval);
                        this.showTaskError(taskType, data.result);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        console.log('Task polling timeout - task may still be running');
                        alert('Task is taking longer than expected. You will be notified via email when complete.');
                    }
                } catch (error) {
                    console.error('Error polling task status:', error);
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                    }
                }
            }, 10000);
        },
        
        showTaskError(taskType, error) {
            // remove from active tasks
            this.activeu = this.activeu.filter(task => task.type !== `${taskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
            
            if (taskType === 'csv_export') {
                this.lastexpo = {
                    success: false,
                    timestamp: new Date().toLocaleString()
                };
            }
            
            alert(`${taskType.replace('_', ' ')} failed: ${error}`);
        },
        
        showTaskSuccess(taskType, result) {
            console.log(`task ${taskType} completed with result:`, result);
            
            // remove from active tasks
            this.activeu = this.activeu.filter(task => task.type !== `${taskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
            
            if (taskType === 'monthly_report') {
                alert('Monthly report has been sent to your email successfully!');
            } else if (taskType === 'csv_export') {
                // update last export status
                this.lastexpo = {
                    success: true,
                    timestamp: new Date().toLocaleString()
                };
                
                let message = 'CSV export completed successfully!\n\n';
                
                console.log('CSV Export Result Structure:', typeof result, result);
                
                if (result && typeof result === 'object') {
                    console.log("debug result"); // debug line
                    message += `Export Details:\n`;
                    message += `Records Exported: ${result.records_exported || 'N/A'}\n`;
                    message += `File Name: ${result.filename || result.file || 'N/A'}\n`;
                    message += `Email Sent: ${result.email_sent ? 'Yes' : 'No'}\n\n`;
                    
                    const downloadFile = result.filename || result.file;
                    if (downloadFile) {
                        message += 'starting automatic download...\n';
                        console.log(`attempting download for filename: ${downloadFile}`);
                        this.downloadCsvFile(downloadFile);
                    } else {
                        console.log('no filename/file found in result for download');
                    }
                } else {
                    console.log('result is not an object or is null/undefined');
                }
                message += 'Check your email for the download link!';
                
                alert(message);
            }
        },
        
        async downloadCsvFile(filename) {
            try {
                console.log(`starting download for: ${filename}`);
                
                // create download link
                const downloadUrl = `/user/download_export/${filename}`;
                
                // method 1: direct window.open
                window.open(downloadUrl, '_blank');
                
                // create invisible download link (fallback)
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log(`download initiated for: ${filename}`);
                
            } catch (error) {
                console.error('Download error:', error);
                alert(`Download failed: ${error.message}\n\nPlease check your email for the download link.`);
            }
        },
        
        async exportQuizData() {
            try {
                this.loadingExport = true;
                
                const response = await fetch('/user/export_quiz_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.success && data.task_id) {
                   
                    this.activeu.push({
                        id: data.task_id,
                        type: 'CSV Export',
                        status: 'PENDING',
                        timestamp: new Date().toLocaleString()
                    });
                    
                    alert(`CSV export started successfully!\n\nTask ID: ${data.task_id}\n\nYou will receive a download link via email once processing is complete.\n\nEstimated completion time: 30-60 seconds.`);
                    
                    // start polling for task status
                    this.pollTaskStatus(data.task_id, 'csv_export');
                } else {
                    alert('Error starting CSV export: ' + (data.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error exporting quiz data:', error);
                alert('Network error: ' + error.message);
            } finally {
                this.loadingExport = false;
            }
        }
    },
    template: `
        <div>
            <UNavBar 
                :user="user?.username || 'User'" 
                userType="user"
                @logout="logout"
                @search="handleSearch"/>
            
            <div v-if="loading" class="d-flex justify-content-center mt-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading summary...</span>
                </div>
            </div>

            <div v-if="error" class="alert alert-danger mt-4 mx-4" role="alert">
                {{ error }}
                <button class="btn btn-secondary mt-2" @click="$router.push('/user/page')">
                    Back to Home
                </button>
            </div>
            
            <div v-if="!loading && !error" class="container mt-4">
                <h2>Your Performance Summary</h2>
                
                <!-- No Data Message -->
                <div v-if="summary.no_data" class="text-center py-5">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No Quiz Data Available</h4>
                    <p class="text-muted">Take some quizzes to see your performance summary.</p>
                    <button class="btn btn-primary" @click="$router.push('/user/page')">
                        <i class="fas fa-play"></i> Take a Quiz
                    </button>
                </div>
                
                <!-- Summary Data -->
                <div v-else>
                    <!-- Statistics Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3 mb-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center">
                                    <h3>{{ summary.total_quizzes || 0 }}</h3>
                                    <p class="mb-0">Total Quizzes</p>
                                </div>
                            </div>
                        </div>
                    <div class="col-md-3 mb-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center">
                                    <h3>{{ summary.accuracy || 0 }}%</h3>
                                    <p class="mb-0">Accuracy</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <div class="card bg-info text-white">
                                <div class="card-body text-center">
                                    <h3>{{ summary.avg_time || 0 }} min</h3>
                                    <p class="mb-0">Avg Time</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center">
                                    <h3>{{ summary.total_correct || 0 }} / {{ summary.total_wrong || 0 }}</h3>
                                    <p class="mb-0">Correct / Wrong</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quiz Statistics Table -->
                    <div v-if="summary.quiz_stats && summary.quiz_stats.length > 0" class="card mb-4">
                        <div class="card-header">
                            <h4>Quiz Performance Breakdown</h4>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Quiz Name</th>
                                            <th>Attempts</th>
                                            <th>Avg Score</th>
                                            <th>Best Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="stat in summary.quiz_stats" :key="stat[0]">
                                            <td><strong>{{ stat[0] }}</strong></td>
                                            <td>{{ stat[1] }}</td>
                                            <td>{{ stat[2].toFixed(1) }}</td>
                                            <td>
                                                <span class="badge bg-success">{{ stat[3] }}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress Chart -->
                    <div v-if="summary.progress_img" class="card mb-4">
                        <div class="card-header">
                            <h4>Score Progress Over Time</h4>
                        </div>
                        <div class="card-body text-center">
                            <img :src="'data:image/png;base64,' + summary.progress_img" 
                                 alt="Progress Chart" 
                                 class="img-fluid" 
                                 style="max-height: 400px;">
                        </div>
                    </div>
                    
                    <!-- Quiz Performance Chart -->
                    <div v-if="summary.quiz_perf_img" class="card mb-4">
                        <div class="card-header">
                            <h4>Quiz Performance Comparison</h4>
                        </div>
                        <div class="card-body text-center">
                            <img :src="'data:image/png;base64,' + summary.quiz_perf_img" 
                                 alt="Quiz Performance Chart" 
                                 class="img-fluid" 
                                 style="max-height: 400px;">
                        </div>
                    </div>
                </div>
                
                <!-- Notification Settings Section -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h4><i class="fas fa-bell"></i> Notification Preferences</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-check form-switch mb-3">
                            <input class="form-check-input" type="checkbox" id="dailyRem" v-model="notiSetting.dailyRem">
                            <label class="form-check-label" for="dailyRem">
                                Receive daily quiz reminders
                            </label>
                        </div>
                        <div class="mb-3">
                            <label for="reminderTime" class="form-label">Preferred reminder time:</label>
                            <select class="form-select" id="reminderTime" v-model="notiSetting.reminderTime">
                                <option value="09:00">9:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="18:00">6:00 PM</option>
                                <option value="20:00">8:00 PM</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" @click="saveNotificationSettings">
                            <i class="fas fa-save"></i> Save Preferences
                        </button>
                    </div>
                </div>
                
                <!-- CSV Export Dashboard -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h4><i class="fas fa-download"></i> Data Export Dashboard</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">                            
                            <div class="col-md-12 mb-3">
                                <div class="alert alert-info">
                                    <h6><i class="fas fa-info-circle"></i> Export Information</h6>
                                    <p class="mb-1">Export your quiz data in CSV format with detailed analytics including:</p>
                                    <ul class="mb-0">
                                        <li>Quiz IDs, names, and metadata</li>
                                        <li>Chapter and subject information</li>
                                        <li>Scores, percentages, and performance metrics</li>
                                        <li>Time taken and attempt timestamps</li>
                                        <li>Performance remarks and recommendations</li>
                                    </ul>
                                </div>
                            </div>
                            
                            
                            <div class="col-md-8">
                                <button 
                                    class="btn btn-success btn-lg w-100" 
                                    @click="exportQuizData"
                                    :disabled="loadingExport">
                                    <span v-if="loadingExport" class="spinner-border spinner-border-sm me-2"></span>
                                    <i v-else class="fas fa-file-csv me-2"></i>
                                    {{ loadingExport ? 'Generating CSV Export...' : 'Export Quiz Data (CSV)' }}
                                </button>
                                <small class="text-muted mt-1 d-block">
                                    <i class="fas fa-clock"></i> Processing time: ~30 seconds | 
                                    <i class="fas fa-envelope"></i> Download link sent via email
                                </small>
                            </div>
                            
                            <!-- Export Status -->
                            <div class="col-md-4">
                                <div v-if="lastexpo" class="text-center">
                                    <div class="badge badge-lg mb-2" :class="lastexpo.success ? 'bg-success' : 'bg-danger'">
                                        {{ lastexpo.success ? 'Last Export: Success' : 'Last Export: Failed' }}
                                    </div>
                                    <small class="d-block text-muted">{{ lastexpo.timestamp }}</small>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Active Export Tasks -->
                        <div v-if="activeu.length > 0" class="mt-3">
                            <h6><i class="fas fa-tasks"></i> Active Export Tasks</h6>
                            <div v-for="task in activeu" :key="task.id" class="alert alert-warning">
                                <div class="d-flex justify-content-between align-items-center">
                                    <span><strong>Task ID:</strong> {{ task.id.substring(0, 8) }}...</span>
                                    <span class="badge bg-warning">{{ task.type }} - {{ task.status }}</span>
                                </div>
                            </div>
                            </div>
                    </div>
                </div>
                
                <!-- Reports Section -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h4><i class="fas fa-file-alt"></i> Monthly Reports</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6 mb-2">
                                <button 
                                    class="btn btn-info w-100" 
                                    @click="requestMonthlyReport('html')"
                                    :disabled="loadingReport">
                                    <span v-if="loadingReport" class="spinner-border spinner-border-sm me-1"></span>
                                    <i v-else class="fas fa-file-code"></i>
                                    {{ loadingReport ? 'Generating...' : 'Monthly Report (HTML)' }}
                                </button>
                            </div>
                            <div class="col-md-6 mb-2">
                                <button 
                                    class="btn btn-warning w-100" 
                                    @click="requestMonthlyReport('pdf')"
                                    :disabled="loadingReport">
                                    <span v-if="loadingReport" class="spinner-border spinner-border-sm me-1"></span>
                                    <i v-else class="fas fa-file-pdf"></i>
                                    {{ loadingReport ? 'Generating...' : 'Monthly Report (PDF)' }}
                                </button>
                            </div>
                         </div>
                       </div>
                </div>
            </div>
        </div>
    `
};
