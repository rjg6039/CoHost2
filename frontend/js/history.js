// Standalone History Page functionality
class HistoryPage {
    constructor() {
        this.data = this.loadHistoryData();
        this.currentFilter = 'week'; // Default to last week
        this.sortState = { field: 'seatedTime', direction: 'desc' };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderHistory();
        applyRestaurantNameFromServer();
    }

    // Load data without affecting hosting page
    loadHistoryData() {
        const savedData = localStorage.getItem('cohost-data');
        if (savedData) {
            const data = JSON.parse(savedData);
            // Ensure history array exists
            if (!data.history) data.history = [];
            return data;
        }

        // Return empty data structure if no saved data
        return {
            history: [],
            waitlist: [],
            rooms: {},
            settings: { restaurantName: 'CoHost Restaurant' }
        };
    }

    // Save data without affecting hosting page
    saveHistoryData() {
        const currentData = this.loadHistoryData();
        currentData.history = this.data.history;
        localStorage.setItem('cohost-data', JSON.stringify(currentData));
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
            const partyDate = new Date(party.completedTime || party.cancelledTime || party.added);
            return partyDate >= cutoffDate;
        });

        // Apply sorting
        return this.sortHistoryData(filtered);
    }

    createHistoryRow(party) {
        const seatedTime = party.seatedTime ? this.formatTime(new Date(party.seatedTime)) : 'N/A';
        const duration = this.calculateDuration(party);
        const status = party.status || (party.cancelledTime ? 'Cancelled' : 'Completed');

        let requirements = '';
        if (party.handicap) requirements += '<span class="requirement-indicator">♿</span>';
        if (party.highchair) requirements += '<span class="requirement-indicator">👶</span>';
        if (party.window) requirements += '<span class="requirement-indicator">🪟</span>';

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
                        <button class="history-action-btn btn-return" onclick="window.historyPage.returnToWaitlist(${party.id})" title="Return to Waitlist">
                            Return
                        </button>
                        <button class="history-action-btn btn-delete" onclick="window.historyPage.deleteFromHistory(${party.id})" title="Delete Permanently">
                            Delete
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
        if (!party.seatedTime) return 'N/A';

        const seated = new Date(party.seatedTime);
        const completed = new Date(party.completedTime || party.cancelledTime || new Date());
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
                    aVal = new Date(a.seatedTime || 0);
                    bVal = new Date(b.seatedTime || 0);
                    break;
                case 'duration':
                    aVal = this.getDurationInMinutes(a);
                    bVal = this.getDurationInMinutes(b);
                    break;
                case 'status':
                    aVal = a.status || (a.cancelledTime ? 'Cancelled' : 'Completed');
                    bVal = b.status || (b.cancelledTime ? 'Cancelled' : 'Completed');
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
        if (!party.seatedTime) return 0;

        const seated = new Date(party.seatedTime);
        const completed = new Date(party.completedTime || party.cancelledTime || new Date());
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
        const partyIndex = this.data.history.findIndex(p => p.id === partyId);
        if (partyIndex === -1) return;

        const party = this.data.history[partyIndex];

        // Create a new waiting party from the history
        const newParty = {
            id: this.generateNewId(),
            name: party.name,
            size: party.size,
            time: new Date().toTimeString().slice(0, 5), // Current time
            phone: party.phone,
            notes: party.notes,
            handicap: party.handicap || false,
            highchair: party.highchair || false,
            window: party.window || false,
            state: 'waiting',
            seatedTime: null,
            completedTime: null,
            tableId: null,
            added: new Date()
        };

        // Add to waitlist in data and remove from history
        this.data.history.splice(partyIndex, 1);

        // Update the main data storage
        const mainData = this.loadHistoryData();
        mainData.waitlist.push(newParty);
        mainData.history = this.data.history;
        localStorage.setItem('cohost-data', JSON.stringify(mainData));

        this.renderHistory();

        alert(`Party "${party.name}" has been returned to the waitlist`);
    }

    deleteFromHistory(partyId) {
        if (confirm('Are you sure you want to permanently delete this party from history? This action cannot be undone.')) {
            this.data.history = this.data.history.filter(p => p.id !== partyId);

            // Update the main data storage
            const mainData = this.loadHistoryData();
            mainData.history = this.data.history;
            localStorage.setItem('cohost-data', JSON.stringify(mainData));

            this.renderHistory();
        }
    }

    generateNewId() {
        const mainData = this.loadHistoryData();
        const maxWaitlistId = Math.max(0, ...mainData.waitlist.map(p => p.id));
        const maxHistoryId = Math.max(0, ...mainData.history.map(p => p.id));
        return Math.max(maxWaitlistId, maxHistoryId) + 1;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.settingsManager) {
        window.settingsManager.applyAllSettings();
    }
    await applyRestaurantNameFromServer();
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
