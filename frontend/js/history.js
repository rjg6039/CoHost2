document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const rangeSelect = document.getElementById("historyRangeSelect");
  const subtitle = document.getElementById("historySubtitle");
  const container = document.getElementById("historyContainer");

  function formatDate(dt) {
    if (!dt) return "Unknown";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function ensureAuthenticated() {
    const user = getCurrentUser();
    if (!user || !getAuthToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function updateSubtitle(days) {
    subtitle.textContent = `Last ${days} days • Completed & cancelled`;
  }

  function renderHistory(parties) {
    if (!parties.length) {
      container.innerHTML = `<div class="empty-state">No completed or cancelled parties in this period.</div>`;
      return;
    }

    container.innerHTML = parties
      .map(p => {
        const stateLabel =
          p.state === "cancelled" ? "Cancelled" : "Completed";
        const time =
          p.state === "cancelled" ? p.cancelledAt || p.addedAt : p.completedAt || p.addedAt;
        const table = p.tableId ? `• Table ${p.tableId}` : "";
        const notes = p.notes ? ` • ${p.notes}` : "";
        const cancelReason =
          p.state === "cancelled" && p.cancelReason
            ? `<span class="tag tag-cancelled">Reason: ${p.cancelReason}</span>`
            : "";

        return `
          <div class="history-row">
            <div class="history-title">${p.name} • party of ${p.size}</div>
            <div class="history-meta">
              ${stateLabel} ${table} • ${formatDate(time)} • Room: ${p.room || "main"}${notes}
            </div>
            <div class="history-tags">
              <span class="tag">${stateLabel}</span>
              <span class="tag">Waited: ${
                p.addedAt && p.seatedAt
                  ? `${Math.round(
                      (new Date(p.seatedAt) - new Date(p.addedAt)) / 60000
                    )} min`
                  : "n/a"
              }</span>
              ${cancelReason}
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function loadHistory() {
    const days = parseInt(rangeSelect.value, 10);
    updateSubtitle(days);

    try {
      const data = await apiRequest(`/waitlist/history?days=${days}`, {
        method: "GET"
      });
      renderHistory(data.parties || []);
    } catch (err) {
      console.error("[History] error:", err);
      container.innerHTML = `<div class="error-state">Failed to load history.</div>`;
    }
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("cohost-token");
    localStorage.removeItem("cohost-user");
    window.location.href = "login.html";
  });

  rangeSelect.addEventListener("change", loadHistory);

  ensureAuthenticated().then(ok => {
    if (ok) loadHistory();
  });
});