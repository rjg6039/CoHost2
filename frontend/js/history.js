// Standalone History Page functionality
class HistoryPage {
    constructor() {
        this.data = { history: [] };
        this.currentFilter = 'week'; // Default to last week
        this.sortState = { field: 'seatedTime', direction: 'desc' };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.refreshHistory();
        this.renderHistory();
        applyRestaurantNameFromServer();
    }

    async refreshHistory() {
        const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
        try {
            const res = await fetch(`${API_BASE}/waitlist/history`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            const data = await res.json();
            this.data.history = (res.ok && Array.isArray(data.parties)) ? data.parties : [];
        } catch (err) {
            console.warn('Unable to load history', err);
            this.data.history = [];
        }
    }

    setupEventListeners() {
        // Time period filter
        const timePeriodFilter = document.getElementById('timePeriodFilter');
        if (timePeriodFilter) {
            timePeriodFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderHistory();
            });
        }

        // Sorting
        document.querySelectorAll('.history-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                this.sortHistory(field);
            });
        });

        // Dark mode is now handled entirely by darkmode.js - no need for setup here
    }

    renderHistory() {
        const historyBody = document.getElementById('historyBody');
        const emptyState = document.getElementById('emptyHistoryState');

        if (!historyBody || !emptyState) return;

        const filteredHistory = this.filterHistory();

        if (filteredHistory.length === 0) {
            emptyState.style.display = 'block';
            historyBody.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        historyBody.innerHTML = filteredHistory.map(party => this.createHistoryRow(party)).join('');
    }

    filterHistory() {
        const now = new Date();
        let cutoffDate;

        switch (this.currentFilter) {
            case 'day':
                cutoffDate = new Date(now);
                cutoffDate.setDate(now.getDate() - 1);
                break;
            case 'week':
                cutoffDate = new Date(now);
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoffDate = new Date(now);
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                cutoffDate = new Date(now);
                cutoffDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
            default:
                cutoffDate = new Date(0); // Beginning of time
                break;
        }

        let filtered = this.data.history.filter(party => {
            const partyDate = this.getEventDate(party);
            return partyDate >= cutoffDate;
        });

        // Apply sorting
        return this.sortHistoryData(filtered);
    }

    createHistoryRow(party) {
        const seatedTime = party.seatedAt ? this.formatTime(new Date(party.seatedAt)) : 'N/A';
        const duration = this.calculateDuration(party);
        const status = (party.state || '').toLowerCase() === 'cancelled' ? 'Cancelled' : 'Completed';

        let requirements = '';
        if (party.handicap) requirements += '<span class="requirement-indicator">?T?</span>';
        if (party.highchair) requirements += '<span class="requirement-indicator">dY`</span>';
        if (party.window) requirements += '<span class="requirement-indicator">dY?Y</span>';
        const pid = party._id || party.id;

        return `
            <tr>
                <td>
                    ${party.name}
                    ${requirements ? `<div class="requirement-indicators">${requirements}</div>` : ''}
                </td>
                <td>${party.size}</td>
                <td>${seatedTime}</td>
                <td class="${this.getDurationClass(duration)}">${duration}</td>
                <td>${party.phone || 'N/A'}</td>
                <td>${party.notes || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${status.toLowerCase()}">${status}</span>
                </td>
                <td>
                    <div class="history-actions-grid">
                        <button class="history-action-btn btn-return" onclick="window.historyPage.returnToWaitlist('${pid}')" title="Return to Waitlist">
                            Return
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    calculateDuration(party) {
        if (!party.seatedAt) return 'N/A';

        const seated = new Date(party.seatedAt);
        const completed = new Date(party.completedAt || party.cancelledAt || new Date());
        const diffMs = completed - seated;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m`;
        }
        return `${diffMins}m`;
    }

    getDurationClass(duration) {
        if (duration === 'N/A') return 'duration-normal';

        // Extract minutes from duration string
        const match = duration.match(/(\d+)h\s*(\d+)m|(\d+)m/);
        let totalMinutes = 0;

        if (match) {
            if (match[1] && match[2]) {
                totalMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
            } else if (match[3]) {
                totalMinutes = parseInt(match[3]);
            }
        }

        if (totalMinutes > 180) return 'duration-very-long'; // > 3 hours
        if (totalMinutes > 120) return 'duration-long'; // > 2 hours
        return 'duration-normal';
    }

    sortHistory(field) {
        if (this.sortState.field === field) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.field = field;
            this.sortState.direction = 'asc';
        }

        this.updateSortHeaders();
        this.renderHistory();
    }

    sortHistoryData(parties) {
        const { field, direction } = this.sortState;

        return parties.sort((a, b) => {
            let aVal, bVal;

            switch (field) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'size':
                    aVal = a.size;
                    bVal = b.size;
                    break;
                case 'seatedTime':
                    aVal = new Date(a.seatedAt || 0);
                    bVal = new Date(b.seatedAt || 0);
                    break;
                case 'duration':
                    aVal = this.getDurationInMinutes(a);
                    bVal = this.getDurationInMinutes(b);
                    break;
                case 'status':
                    aVal = a.state || (a.cancelledAt ? 'cancelled' : 'completed');
                    bVal = b.state || (b.cancelledAt ? 'cancelled' : 'completed');
                    break;
                default:
                    aVal = a[field];
                    bVal = b[field];
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    getDurationInMinutes(party) {
        if (!party.seatedAt) return 0;

        const seated = new Date(party.seatedAt);
        const completed = new Date(party.completedAt || party.cancelledAt || new Date());
        return Math.floor((completed - seated) / 60000);
    }

    updateSortHeaders() {
        document.querySelectorAll('.history-table th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-sort') === this.sortState.field) {
                th.classList.add(`sort-${this.sortState.direction}`);
            }
        });
    }

    returnToWaitlist(partyId) {
        const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
        if (!token) return;
        fetch(`${API_BASE}/waitlist/${partyId}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ state: 'waiting', tableId: null })
        }).then(() => this.refreshHistory().then(() => this.renderHistory()))
          .catch(err => console.error('Return to waitlist failed', err));
    }

    getEventDate(party) {
        return new Date(party.completedAt || party.cancelledAt || party.addedAt || party.added || 0);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await applyRestaurantNameFromServer();
    if (window.settingsManager) {
        window.settingsManager.applyAllSettings();
    }
    if (document.getElementById('historyBody')) {
        window.historyPage = new HistoryPage();
    }
});

async function applyRestaurantNameFromServer() {
    const header = document.getElementById('restaurantName');
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
    let name = (typeof getAuthUser === 'function' && getAuthUser()?.restaurantName) ? getAuthUser().restaurantName : (window.settingsManager?.getRestaurantName?.() || "CoHost Restaurant");

    if (token) {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const me = await res.json();
                if (me?.restaurantName) {
                    name = me.restaurantName;
                    if (typeof setAuthUser === 'function' && typeof getAuthUser === 'function') {
                        setAuthUser({ ...(getAuthUser() || {}), restaurantName: name });
                    }
                }
            }
        } catch (_) {}
    }

    if (header) header.textContent = name;
    document.title = `History - ${name}`;
}
