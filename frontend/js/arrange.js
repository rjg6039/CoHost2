document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const waitingList = document.getElementById("waitingList");
  const seatedList = document.getElementById("seatedList");

  async function ensureAuthenticated() {
    const user = getCurrentUser();
    if (!user || !getAuthToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function renderLists(parties) {
    const waiting = parties.filter(p => p.state === "waiting");
    const seated = parties.filter(p => p.state === "seated");

    if (!waiting.length) {
      waitingList.innerHTML = `<div class="empty-state">No guests waiting.</div>`;
    } else {
      waitingList.innerHTML = waiting
        .map(p => {
          const addedAt = p.addedAt ? new Date(p.addedAt) : null;
          const addedText = addedAt
            ? addedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : "Unknown time";

          return `
          <div class="arrange-card" data-id="${p._id}">
            <div class="arrange-card-header">
              <div class="arrange-name">${p.name}</div>
              <div class="arrange-meta">Party of ${p.size}</div>
            </div>
            <div class="arrange-meta">
              Room: ${p.room || "main"} • Added: ${addedText}
            </div>
            <div class="arrange-actions">
              <button class="arrange-button arrange-button-primary" data-action="seat">Seat…</button>
              <button class="arrange-button" data-action="cancel">Cancel</button>
            </div>
          </div>
        `;
        })
        .join("");
    }

    if (!seated.length) {
      seatedList.innerHTML = `<div class="empty-state">No guests seated.</div>`;
    } else {
      seatedList.innerHTML = seated
        .map(p => {
          const seatedAt = p.seatedAt ? new Date(p.seatedAt) : null;
          const seatedText = seatedAt
            ? seatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : "Unknown time";
          const table = p.tableId ? `Table ${p.tableId}` : "No table set";

          return `
          <div class="arrange-card" data-id="${p._id}">
            <div class="arrange-card-header">
              <div class="arrange-name">${p.name}</div>
              <div class="arrange-meta">${table}</div>
            </div>
            <div class="arrange-meta">
              Room: ${p.room || "main"} • Seated: ${seatedText}
            </div>
            <div class="arrange-actions">
              <button class="arrange-button" data-action="retable">Change table…</button>
              <button class="arrange-button" data-action="complete">Complete</button>
              <button class="arrange-button arrange-button-danger" data-action="cancel">Cancel</button>
            </div>
          </div>
        `;
        })
        .join("");
    }
  }

  async function loadParties() {
    try {
      const data = await apiRequest("/waitlist", { method: "GET" });
      renderLists(data.parties || []);
    } catch (err) {
      console.error("[Arrange] loadParties error:", err);
      waitingList.innerHTML = `<div class="error-state">Failed to load parties.</div>`;
      seatedList.innerHTML = `<div class="error-state">Failed to load parties.</div>`;
    }
  }

  async function updateState(id, body) {
    try {
      await apiRequest(`/waitlist/${id}/state`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      await loadParties();
    } catch (err) {
      console.error("[Arrange] updateState error:", err);
      alert("Failed to update party. Check console for details.");
    }
  }

  function handleClick(listEl) {
    listEl.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const card = e.target.closest(".arrange-card");
      if (!card) return;
      const id = card.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "seat" || action === "retable") {
        const current = action === "retable" ? "New table number:" : "Table number:";
        const input = window.prompt(current, "");
        if (!input) return;
        const tableId = parseInt(input, 10);
        if (Number.isNaN(tableId) || tableId <= 0) {
          alert("Enter a valid table number.");
          return;
        }
        updateState(id, { state: "seated", tableId });
      } else if (action === "complete") {
        updateState(id, { state: "completed" });
      } else if (action === "cancel") {
        const reason = window.prompt("Cancel reason (optional):", "");
        updateState(id, { state: "cancelled", cancelReason: reason || undefined });
      }
    });
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("cohost-token");
    localStorage.removeItem("cohost-user");
    window.location.href = "login.html";
  });

  handleClick(waitingList);
  handleClick(seatedList);

  ensureAuthenticated().then(ok => {
    if (ok) loadParties();
  });
});