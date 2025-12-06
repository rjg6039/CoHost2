const analyticsState = {
    days: parseInt(localStorage.getItem('cohost-analytics-timeRange') || '30', 10),
    charts: {},
    analytics: null
};

function getAuthHeaders() {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;
    if (!token) {
        window.location.href = "login.html";
        return null;
    }
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

async function authFetch(path) {
    const headers = getAuthHeaders();
    if (!headers) return null;

    const res = await fetch(`${API_BASE}${path}`, { headers });

    if (res.status === 401) {
        clearAuth();
        window.location.href = "login.html";
        return null;
    }

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
    }

    return res.json();
}

function setRestaurantName() {
    const header = document.getElementById("restaurantName");
    const user = typeof getAuthUser === "function" ? getAuthUser() : null;
    const settingsName = window.settingsManager?.getRestaurantName?.();
    const name = user?.restaurantName || settingsName || "CoHost Restaurant";
    if (header) header.textContent = name;
    document.title = `Analytics - ${name}`;
}

async function refreshUserName() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
        });
        if (!res.ok) throw new Error();
        const me = await res.json();
        if (me?.restaurantName) {
            const header = document.getElementById("restaurantName");
            if (header) header.textContent = me.restaurantName;
            document.title = `Analytics - ${me.restaurantName}`;
            if (typeof setAuthUser === "function") {
                setAuthUser({ ...(getAuthUser() || {}), restaurantName: me.restaurantName });
            }
        }
    } catch (_) {
        setRestaurantName();
    }
}

function formatHour(hour) {
    const h = Number(hour);
    return `${h.toString().padStart(2, "0")}:00`;
}

function renderMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderSummary() {
    const metrics = analyticsState.analytics?.metrics || {};
    const activeParties = (metrics.waitingCount || 0) + (metrics.seatedCount || 0);

    renderMetric("totalGuests", (metrics.totalGuests || 0).toLocaleString());
    renderMetric("totalParties", (metrics.totalParties || 0).toLocaleString());
    renderMetric("avgPartySize", (metrics.avgPartySize || 0).toFixed(1));
    renderMetric("avgWaitTime", `${(metrics.avgWaitMinutes || 0).toFixed(1)} min`);
    renderMetric("completedParties", metrics.completedCount || 0);
    renderMetric("cancelledParties", metrics.cancelledCount || 0);
    renderMetric("activeParties", activeParties);
    renderMetric("peakHour", metrics.peakHour !== null && metrics.peakHour !== undefined ? formatHour(metrics.peakHour) : "N/A");
}

function destroyChart(key) {
    if (analyticsState.charts[key]) {
        analyticsState.charts[key].destroy();
        analyticsState.charts[key] = null;
    }
}

function renderHourlyChart() {
    const ctx = document.getElementById("hourlyChart")?.getContext("2d");
    if (!ctx) return;

    const hourly = analyticsState.analytics?.metrics?.hourly || [];
    const labels = hourly.map(h => formatHour(h.hour));
    const guestData = hourly.map(h => h.guests || 0);
    const partyData = hourly.map(h => h.parties || 0);

    destroyChart("hourly");
    analyticsState.charts.hourly = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Guests per hour",
                    data: guestData,
                    borderColor: "var(--chart-line-1)",
                    backgroundColor: "rgba(0, 122, 255, 0.1)",
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: "Parties per hour",
                    data: partyData,
                    borderColor: "var(--chart-line-2)",
                    backgroundColor: "rgba(52,199,89,0.1)",
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: { y: { beginAtZero: true, title: { display: true, text: "Count" } } }
        }
    });
}

function renderDailyChart() {
    const ctx = document.getElementById("dailyChart")?.getContext("2d");
    if (!ctx) return;

    const daily = analyticsState.analytics?.daily || [];
    const labels = daily.map(d => new Date(d.date).toLocaleDateString());
    const parties = daily.map(d => d.parties || 0);
    const waits = daily.map(d => (d.avgWaitMinutes || 0).toFixed(1));

    destroyChart("daily");
    analyticsState.charts.daily = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "Parties per day",
                    data: parties,
                    backgroundColor: "var(--chart-line-1)",
                    borderRadius: 4
                },
                {
                    label: "Avg wait (min)",
                    data: waits,
                    type: "line",
                    borderColor: "var(--chart-line-2)",
                    backgroundColor: "rgba(52,199,89,0.1)",
                    borderWidth: 3,
                    tension: 0.3,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: "Parties" } },
                y1: {
                    beginAtZero: true,
                    position: "right",
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: "Minutes" }
                }
            }
        }
    });
}

function renderRoomChart() {
    const ctx = document.getElementById("occupancyChart")?.getContext("2d");
    if (!ctx) return;

    const rooms = analyticsState.analytics?.rooms || [];
    const labels = rooms.map(r => r.room);
    const parties = rooms.map(r => r.parties || 0);

    destroyChart("rooms");
    analyticsState.charts.rooms = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [
                {
                    data: parties,
                    backgroundColor: [
                        "var(--chart-line-1)",
                        "var(--chart-line-2)",
                        "var(--chart-line-3)",
                        "#FFD60A",
                        "#BF5AF2"
                    ],
                    borderWidth: 2,
                    borderColor: "var(--card-bg)"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } },
            cutout: "60%"
        }
    });
}

function renderStateChart() {
    const ctx = document.getElementById("revenueChart")?.getContext("2d");
    if (!ctx) return;

    const metrics = analyticsState.analytics?.metrics || {};
    const data = [
        metrics.completedCount || 0,
        metrics.cancelledCount || 0,
        metrics.waitingCount || 0,
        metrics.seatedCount || 0
    ];

    destroyChart("states");
    analyticsState.charts.states = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Completed", "Cancelled", "Waiting", "Seated"],
            datasets: [
                {
                    label: "Parties",
                    data,
                    backgroundColor: "var(--chart-line-1)",
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, title: { display: true, text: "Count" } } }
        }
    });
}

function renderRoomMetrics() {
    const container = document.getElementById("roomMetrics");
    if (!container) return;

    const rooms = analyticsState.analytics?.rooms || [];
    if (!rooms.length) {
        container.innerHTML = '<div class="empty-state">No room data yet</div>';
        return;
    }

    container.innerHTML = rooms
        .map(room => `
            <div class="room-pin">
                <div class="pin-header">
                    <h3 class="pin-title">${room.room}</h3>
                    <span class="occupancy-badge">${room.parties} parties</span>
                </div>
                <div class="pin-metrics">
                    <div class="metric-row">
                        <span class="metric-label">Guests</span>
                        <span class="metric-value">${room.guests}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Avg size</span>
                        <span class="metric-value">${(room.avgPartySize || 0).toFixed(1)}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Completed</span>
                        <span class="metric-value metric-seated">${room.completed}</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Cancelled</span>
                        <span class="metric-value metric-danger">${room.cancelled}</span>
                    </div>
                </div>
            </div>
        `)
        .join("");
}

function renderCharts() {
    renderHourlyChart();
    renderDailyChart();
    renderRoomChart();
    renderStateChart();
}

async function loadSummary() {
    const loadingEl = document.getElementById("insightsStatus");
    if (loadingEl) loadingEl.textContent = "Loading data...";

    try {
        const analytics = await authFetch(`/analytics/summary?days=${analyticsState.days}`);
        if (!analytics) return;

        analyticsState.analytics = analytics;
        renderSummary();
        renderCharts();
        renderRoomMetrics();

        const updated = document.getElementById("lastUpdated");
        if (updated) updated.textContent = new Date().toLocaleTimeString();
    } catch (err) {
        console.error("Failed to load analytics summary", err);
    }
}

function renderInsightsContent(insights, provider) {
    const content = document.getElementById("insightsContent");
    const status = document.getElementById("insightsStatus");

    if (status) {
        status.innerHTML = provider === "openai"
            ? '<span class="status-connected">OpenAI insights</span>'
            : '<span class="status-disconnected">Fallback insights</span>';
    }

    if (!content) return;
    if (!insights || !insights.length) {
        content.innerHTML = '<div class="insight-item"><div class="insight-text">No insights available yet.</div></div>';
        return;
    }

    content.innerHTML = insights.map((text, idx) => `
        <div class="insight-item">
            <div class="insight-icon">★</div>
            <div class="insight-text">${text}</div>
        </div>
    `).join("");
}

async function loadInsights() {
    const btn = document.getElementById("refreshInsights");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Loading...";
    }

    try {
        const data = await authFetch(`/analytics/insights?days=${analyticsState.days}`);
        if (data) {
            renderInsightsContent(data.insights || [], data.provider);
        }
    } catch (err) {
        renderInsightsContent(
            [
                "Unable to load AI insights right now.",
                "Check your OpenAI API key on the server and try again."
            ],
            "fallback"
        );
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⟳ Refresh Insights';
        }
    }
}

function handleTimeRangeChange() {
    const select = document.getElementById("timeRange");
    if (!select) return;

    select.value = analyticsState.days.toString();
    select.addEventListener("change", async e => {
        analyticsState.days = parseInt(e.target.value, 10);
        localStorage.setItem('cohost-analytics-timeRange', analyticsState.days.toString());
        await loadSummary();
        await loadInsights();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await refreshUserName();
    handleTimeRangeChange();

    const refreshBtn = document.getElementById("refreshInsights");
    if (refreshBtn) refreshBtn.addEventListener("click", loadInsights);

    await loadSummary();
    await loadInsights();
});
