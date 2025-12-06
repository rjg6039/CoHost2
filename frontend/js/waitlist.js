document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("waitlistContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  async function ensureAuthenticated() {
    const user = getCurrentUser();
    if (!user || !getAuthToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function renderWaitlist(parties) {
    if (!parties.length) {
      container.innerHTML = `<div class="empty-state">No guests on the waitlist yet.</div>`;
      return;
    }

    container.innerHTML = parties
      .map(
        p => `
        <div class="list-row">
          <div>
            <div class="list-row-title">${p.name}</div>
            <div class="list-row-subtitle">
              Party of ${p.size} • ${p.room || "main"} • ${p.state}
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  async function loadWaitlist() {
    try {
      const data = await apiRequest("/waitlist", { method: "GET" });
      renderWaitlist(data.parties || []);
    } catch (err) {
      console.error("[Waitlist] error:", err);
      container.innerHTML = `<div class="error-state">Failed to load waitlist.</div>`;
    }
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("cohost-token");
    localStorage.removeItem("cohost-user");
    window.location.href = "login.html";
  });

  ensureAuthenticated().then(ok => {
    if (ok) loadWaitlist();
  });
});