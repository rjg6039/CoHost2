// relies on config.js having apiRequest, setAuthToken, setCurrentUser

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("error");

  async function handleLogin() {
    errorBox.textContent = "";
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value
        })
      });
      setAuthToken(data.token);
      setCurrentUser(data.user);
      window.location.href = "index.html";
    } catch (err) {
      errorBox.textContent = err.message;
    }
  }

  async function handleRegister() {
    errorBox.textContent = "";
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: emailInput.value,
          password: passwordInput.value
        })
      });
      setAuthToken(data.token);
      setCurrentUser(data.user);
      window.location.href = "index.html";
    } catch (err) {
      errorBox.textContent = err.message;
    }
  }

  loginBtn.addEventListener("click", handleLogin);
  registerBtn.addEventListener("click", handleRegister);

  passwordInput.addEventListener("keyup", e => {
    if (e.key === "Enter") handleLogin();
  });
});