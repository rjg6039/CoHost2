// frontend/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const restaurantInput = document.getElementById('restaurantName');
  const restaurantRow = document.getElementById('restaurantRow');
  const errorBox = document.getElementById('authError');
  const tabs = document.querySelectorAll('.auth-tab');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const form = document.getElementById('authForm');

  if (!form) return;

  let mode = 'login';

  function setMode(nextMode) {
    mode = nextMode;
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === nextMode);
    });

    const isRegister = nextMode === 'register';
    restaurantRow.classList.toggle('hidden', !isRegister);
    loginBtn.classList.toggle('hidden', isRegister);
    registerBtn.classList.toggle('hidden', !isRegister);
    errorBox.textContent = '';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  async function handleLogin() {
    errorBox.textContent = '';
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Login error:', err);
      errorBox.textContent = err.message || 'Login failed';
    }
  }

  async function handleRegister() {
    errorBox.textContent = '';
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
          restaurantName: restaurantInput.value.trim() || undefined
        })
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);
      window.location.href = 'index.html';
    } catch (err) {
      console.error('Register error:', err);
      errorBox.textContent = err.message || 'Registration failed';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  });

  setMode('login');
});
