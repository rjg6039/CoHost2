// Simple config so you can change later if frontend & backend split
const API_BASE_URL = `${window.location.origin.replace(/\/$/, "")}/api`;

function getAuthToken() {
  return localStorage.getItem("cohost-token");
}

function setAuthToken(token) {
  localStorage.setItem("cohost-token", token);
}

function setCurrentUser(user) {
  localStorage.setItem("cohost-user", JSON.stringify(user));
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("cohost-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// generic helper
async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}