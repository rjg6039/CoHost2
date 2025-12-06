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

// Enhanced API request function
async function apiRequest(path, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!getAuthToken()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Check authentication status on page load
function checkAuth() {
    if (!getAuthToken() && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}