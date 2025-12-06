// frontend/js/config.js

// UPDATE THIS to your actual backend Render URL
// Example: const PRODUCTION_API_BASE = 'https://cohost2-backend.onrender.com/api';
const PRODUCTION_API_BASE = 'https://cohost2-backend.onrender.com/'; // <-- change this

// Local dev vs production
const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : PRODUCTION_API_BASE;

// ===== Auth token helpers =====
function getAuthToken() {
  return localStorage.getItem('cohost-token');
}

function setAuthToken(token) {
  localStorage.setItem('cohost-token', token);
}

function clearAuthToken() {
  localStorage.removeItem('cohost-token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('cohost-user');
  return raw ? JSON.parse(raw) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('cohost-user', JSON.stringify(user));
}

function logout() {
  clearAuthToken();
  localStorage.removeItem('cohost-user');
  window.location.href = 'login.html';
}

// ===== Core API helper =====
async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // ignore
  }

  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }

  return data;
}

// ===== Simple route guard =====
function isLoginPage() {
  const path = window.location.pathname;
  return path.endsWith('login.html') || path === '/login';
}

function guardRoutes() {
  if (isLoginPage()) {
    // if already logged in, go straight to hosting
    if (getAuthToken()) {
      window.location.href = 'index.html';
    }
    return;
  }

  // any other page requires auth
  if (!getAuthToken()) {
    window.location.href = 'login.html';
  }
}

// Run route guard early
document.addEventListener('DOMContentLoaded', guardRoutes);
