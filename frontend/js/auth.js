
// Handles login / register for CoHost2 using email + password

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authForm");
    const loginBtn = document.getElementById("loginModeBtn");
    const registerBtn = document.getElementById("registerModeBtn");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const submitBtn = document.getElementById("authSubmitBtn");
    const errorEl = document.getElementById("authError");

    let mode = "login"; // "login" or "register"

    function setMode(newMode) {
        mode = newMode;

        const restaurantGroup = document.getElementById("restaurantNameGroup");

        if (mode === "login") {
            loginBtn.classList.add("active");
            registerBtn.classList.remove("active");
            authTitle.textContent = "Sign in";
            authSubtitle.textContent = "Use your CoHost email and password.";
            submitBtn.textContent = "Login";
            if (restaurantGroup) restaurantGroup.style.display = "none";
        } else {
            registerBtn.classList.add("active");
            loginBtn.classList.remove("active");
            authTitle.textContent = "Create an account";
            authSubtitle.textContent = "Choose an email, password, and restaurant name to get started.";
            submitBtn.textContent = "Register";
            if (restaurantGroup) restaurantGroup.style.display = "block";
        }

        if (errorEl) {
            errorEl.style.display = "none";
            errorEl.textContent = "";
        }
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", () => setMode("login"));
    }
    if (registerBtn) {
        registerBtn.addEventListener("click", () => setMode("register"));
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (errorEl) {
            errorEl.style.display = "none";
            errorEl.textContent = "";
        }

        const email = (form.email?.value || "").trim();
        const password = (form.password?.value || "").trim();
        const restaurantName = (form.restaurantName?.value || "").trim();

        if (!email || !password) {
            if (errorEl) {
                errorEl.textContent = "Email and password are required.";
                errorEl.style.display = "block";
            }
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = mode === "login" ? "Logging in..." : "Registering...";

        try {
            const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    ...(mode === "register" ? { restaurantName } : {})
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg = data && (data.error || data.message) || "Unable to " + (mode === "login" ? "log in." : "register.");
                throw new Error(msg);
            }

            if (data.token) {
                setAuthToken(data.token);
            }
            if (data.user) {
                setAuthUser(data.user);
            }

            window.location.href = "index.html";
        } catch (err) {
            console.error(err);
            if (errorEl) {
                errorEl.textContent = err.message || "Something went wrong.";
                errorEl.style.display = "block";
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = mode === "login" ? "Login" : "Register";
        }
    });
});
