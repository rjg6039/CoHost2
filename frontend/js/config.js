// Configuration for API endpoints
const API_BASE_URL = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Authentication helpers
function getAuthToken() {
    return localStorage.getItem('cohost-token');
}

function setAuthToken(token) {
    localStorage.setItem('cohost-token', token);
}

function getCurrentUser() {
    const user = localStorage.getItem('cohost-user');
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('cohost-user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('cohost-token');
    localStorage.removeItem('cohost-user');
    window.location.href = 'login.html';
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
