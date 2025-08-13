const { createApp } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

console.log('Main.js loaded');

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

console.log('Router created:', router);
console.log('Routes:', routes);

const app = createApp({
    mounted() {
        console.log('Vue app mounted successfully!');
        console.log('Current route on mount:', this.$route.path);
    }
});

app.use(router);

// debug helper - casual variable name
window.debugVue = {
    router: router,
    getCurrentRoute: () => router.currentRoute.value,
    navigateTo: (path) => router.push(path),
    getRoutes: () => routes
};

app.mount('#app');
console.log('App mounting attempted');
