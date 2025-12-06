
// Basic frontend configuration for CoHost2

// Backend API base. You can override this with window.COHOST_API_BASE
// before this script loads if you ever need to.
const API_BASE = (typeof window !== "undefined" && window.COHOST_API_BASE)
    ? window.COHOST_API_BASE
    : "https://cohost2-backend.onrender.com/api";

// Storage keys
const TOKEN_KEY = "cohost2_token";
const USER_KEY = "cohost2_user";

function getAuthToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
        return null;
    }
}

function setAuthToken(token) {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch (e) {
        console.error("Unable to access localStorage for auth token", e);
    }
}

function setAuthUser(user) {
    try {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    } catch (e) {
        console.error("Unable to access localStorage for user", e);
    }
}

function getAuthUser() {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearAuth() {
    setAuthToken(null);
    setAuthUser(null);
}

// Redirect to login if no token and not already on login page
(function enforceAuthOnProtectedPages() {
    if (typeof window === "undefined") return;

    const path = window.location.pathname || "";
    const isLoginPage =
        path.endsWith("/login.html") ||
        path.endsWith("/login") ||
        /login\.html$/.test(path);

    if (!isLoginPage && !getAuthToken()) {
        // Let the page finish minimal render, then redirect
        window.addEventListener("DOMContentLoaded", () => {
            window.location.href = "login.html";
        });
    }
})();
