document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const timeRangeSelect = document.getElementById("timeRangeSelect");
  const subtitle = document.getElementById("analyticsSubtitle");

  const metricTotalGuests = document.getElementById("metricTotalGuests");
  const metricAvgWait = document.getElementById("metricAvgWait");
  const metricAvgPartySize = document.getElementById("metricAvgPartySize");
  const metricCancelRate = document.getElementById("metricCancelRate");

  const aiStatus = document.getElementById("aiStatus");
  const insightsList = document.getElementById("insightsList");

  let chart;

  async function ensureAuthenticated() {
    const user = getCurrentUser();
    if (!user || !getAuthToken()) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function updateSubtitle(days) {
    subtitle.textContent = `Last ${days} days • Live from CoHost`;
  }

  function renderMetrics(metrics) {
    metricTotalGuests.textContent = metrics.totalGuests;
    metricAvgWait.textContent = `${metrics.avgWaitMinutes.toFixed(1)} min`;
    metricAvgPartySize.textContent = metrics.avgPartySize.toFixed(1);
    const cancelRate =
      metrics.totalParties > 0
        ? (metrics.cancelledCount / metrics.totalParties) * 100
        : 0;
    metricCancelRate.textContent = `${cancelRate.toFixed(0)}%`;
  }

  function renderChart(hourly) {
    const ctx = document.getElementById("hourlyGuestsChart");
    const labels = hourly.map(h => `${h.hour}:00`);
    const values = hourly.map(h => h.guests);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Guests",
            data: values,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { font: { size: 11 } }
          },
          y: {
            ticks: { font: { size: 11 } },
            beginAtZero: true
          }
        }
      }
    });
  }

  function renderInsights(list, demo = false) {
    insightsList.innerHTML = "";
    list.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      insightsList.appendChild(li);
    });
    aiStatus.textContent = demo ? "Demo" : "Live";
  }

  async function loadAnalytics() {
    const days = parseInt(timeRangeSelect.value, 10);
    updateSubtitle(days);

    try {
      const summary = await apiRequest(`/analytics/summary?days=${days}`, {
        method: "GET"
      });
      renderMetrics(summary.metrics);
      renderChart(summary.metrics.hourly || []);

      const insights = await apiRequest(`/analytics/insights?days=${days}`, {
        method: "GET"
      });
      renderInsights(insights.insights || [], !insights.live);
    } catch (err) {
      console.error("[Analytics] error:", err);
      renderInsights(
        ["Analytics unavailable. Check your backend and MongoDB connection."],
        true
      );
    }
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("cohost-token");
    localStorage.removeItem("cohost-user");
    window.location.href = "login.html";
  });

  ensureAuthenticated().then(ok => {
    if (ok) loadAnalytics();
  });

  timeRangeSelect.addEventListener("change", loadAnalytics);
});