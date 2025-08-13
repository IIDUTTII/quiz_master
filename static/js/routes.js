const routes = [
    { path: '/', component: HomePage },
    { path: '/register', component: RegisterPage },
    
    // admin routes
    { path: '/admin/profile', component: AdminProfilePage },
    { path: '/admin/login', component: AdminLogin },
    { path: '/admin/page', component: AdminPage },
    { path: '/admin/create-edit', component: CreateEditPage },
    { path: '/admin/database', component: DatabasePage },
    { path: '/admin/summary', component: AdminSummaryPage },
    {path: '/admin/users', component: EditUsersPage},
    { path: '/admin/jobs', component: AdminJobsPage },
    {path: '/admin/search', component: SearchResultsPage},

    // user routes
    {path: '/user/login', component: UserLoginPage},
    { path: '/user/page', component: UserPage },
    { path: '/user/page/search', component: UserSearchPage },
    { path: '/user/take_quiz', component: TakeQuizPage },
    { path: '/user/quiz_scores', component: QuizScoresPage },
    { path: '/user/summary', component: UserSummaryPage },
    
    // catch all
    { path: '/:pathMatch(.*)*', redirect: '/' }
];
