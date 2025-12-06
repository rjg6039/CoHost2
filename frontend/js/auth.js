// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('error');

    // Check if user is already logged in
    if (getAuthToken()) {
        window.location.href = 'index.html';
        return;
    }

    async function handleLogin() {
        errorBox.textContent = '';
        try {
            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            setAuthToken(data.token);
            setCurrentUser(data.user);
            window.location.href = 'index.html';
        } catch (err) {
            errorBox.textContent = err.message || 'Login failed. Please try again.';
            console.error('Login error:', err);
        }
    }

    async function handleRegister() {
        errorBox.textContent = '';
        try {
            const data = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailInput.value,
                    password: passwordInput.value
                })
            });

            setAuthToken(data.token);
            setCurrentUser(data.user);
            window.location.href = 'index.html';
        } catch (err) {
            errorBox.textContent = err.message || 'Registration failed. Please try again.';
            console.error('Registration error:', err);
        }
    }

    // Event listeners
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);

    if (passwordInput) {
        passwordInput.addEventListener('keyup', e => {
            if (e.key === 'Enter') handleLogin();
        });
    }
});
