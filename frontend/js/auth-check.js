// Require authentication before loading any page
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('cohost-token');
    const user = localStorage.getItem('cohost-user');

    if (!token || !user) {
        // Redirect to login if not authenticated
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    } else {
        // User is authenticated, proceed with page load
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
    }
});
