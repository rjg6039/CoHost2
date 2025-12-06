const ACCENT_KEY = "cohost-accent";

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const restaurantNameInput = document.getElementById("restaurantNameInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileStatus = document.getElementById("profileStatus");

  const accentSelect = document.getElementById("accentSelect");
  const accentDot = document.getElementById("accentDot");
  const accentLabel = document.getElementById("accentLabel");
  const saveAppearanceBtn = document.getElementById("saveAppearanceBtn");
  const resetAppearanceBtn = document.getElementById("resetAppearanceBtn");
  const appearanceStatus = document.getElementById("appearanceStatus");

  function setStatus(el, msg, ok) {
    el.textContent = msg || "";
    el.classList.remove("settings-status-ok", "settings-status-error");
    if (!msg) return;
    el.classList.add(ok ? "settings-status-ok" : "settings-status-error");
  }

  async function ensureAuthenticated() {
    const user = getCurrentUser();
    if (!user || !getAuthToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function applyAccent(color) {
    if (!color) return;
    document.documentElement.style.setProperty("--accent", color);
    if (accentDot) accentDot.style.background = color;
  }

  function loadAccentFromStorage() {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored) {
      accentSelect.value = stored;
      applyAccent(stored);
      accentLabel.textContent = stored;
    } else {
      // default already set in CSS root
      accentLabel.textContent = accentSelect.value;
      applyAccent(accentSelect.value);
    }
  }

  async function loadProfile() {
    try {
      const data = await apiRequest("/auth/me", { method: "GET" });
      restaurantNameInput.value = data.restaurantName || "";
    } catch (err) {
      console.error("[Settings] loadProfile error:", err);
      setStatus(profileStatus, "Failed to load profile.", false);
    }
  }

  async function saveProfile() {
    setStatus(profileStatus, "", true);
    try {
      const data = await apiRequest("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          restaurantName: restaurantNameInput.value
        })
      });
      setCurrentUser({
        id: data.id,
        email: data.email,
        restaurantName: data.restaurantName
      });
      setStatus(profileStatus, "Profile saved.", true);
    } catch (err) {
      console.error("[Settings] saveProfile error:", err);
      setStatus(profileStatus, err.message, false);
    }
  }

  function saveAppearance() {
    const value = accentSelect.value;
    localStorage.setItem(ACCENT_KEY, value);
    applyAccent(value);
    accentLabel.textContent = value;
    setStatus(appearanceStatus, "Appearance saved.", true);
  }

  function resetAppearance() {
    localStorage.removeItem(ACCENT_KEY);
    const defaultColor = "#007aff";
    accentSelect.value = defaultColor;
    applyAccent(defaultColor);
    accentLabel.textContent = defaultColor;
    setStatus(appearanceStatus, "Appearance reset to default.", true);
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("cohost-token");
    localStorage.removeItem("cohost-user");
    window.location.href = "login.html";
  });

  saveProfileBtn.addEventListener("click", saveProfile);

  accentSelect.addEventListener("change", () => {
    applyAccent(accentSelect.value);
    accentLabel.textContent = accentSelect.value;
  });

  saveAppearanceBtn.addEventListener("click", saveAppearance);
  resetAppearanceBtn.addEventListener("click", resetAppearance);

  ensureAuthenticated().then(ok => {
    if (ok) {
      loadProfile();
      loadAccentFromStorage();
    }
  });
});