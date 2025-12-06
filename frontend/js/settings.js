// Settings Page functionality
class SettingsPage {
    constructor() {
        this.settings = window.settingsManager.loadSettings();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateForm();
    }

    setupEventListeners() {
        // Save settings button
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettingsFromForm();
        });

        // Reset settings button
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            this.resetSettings();
        });

        const resetRoomsBtn = document.getElementById('resetRoomsBtn');
        if (resetRoomsBtn) {
            resetRoomsBtn.addEventListener('click', () => this.resetRooms());
        }

        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        // Real-time updates for better UX
        const nameInput = document.getElementById('restaurantNameInput');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.settings.restaurantName = e.target.value;
                window.settingsManager.saveSettings(this.settings);
            });
        }

        const accentSelect = document.getElementById('accentColorSelect');
        if (accentSelect) {
            accentSelect.addEventListener('change', (e) => {
                this.settings.accentColor = e.target.value;
                window.settingsManager.saveSettings(this.settings);
            });
        }
    }

    populateForm() {
        const nameInput = document.getElementById('restaurantNameInput');
        const accentSelect = document.getElementById('accentColorSelect');
        const avgDining = document.getElementById('avgDiningTimeInput');
        const defaultRoom = document.getElementById('defaultRoomSelect');
        const showSeated = document.getElementById('showSeatedInWaitlist');
        const autoClear = document.getElementById('autoClearCompleted');

        if (nameInput) nameInput.value = this.settings.restaurantName || '';
        if (accentSelect) accentSelect.value = this.settings.accentColor || 'blue';
        if (avgDining) avgDining.value = this.settings.avgDiningTime || 90;
        if (defaultRoom) defaultRoom.value = this.settings.defaultRoom || 'main';
        if (showSeated) showSeated.checked = !!this.settings.showSeatedInWaitlist;
        if (autoClear) autoClear.checked = !!this.settings.autoClearCompleted;
    }

    saveSettingsFromForm() {
        this.settings.restaurantName = document.getElementById('restaurantNameInput')?.value || "CoHost Restaurant";
        this.settings.accentColor = document.getElementById('accentColorSelect')?.value || "blue";
        this.settings.avgDiningTime = parseInt(document.getElementById('avgDiningTimeInput')?.value || "90", 10);
        this.settings.defaultRoom = document.getElementById('defaultRoomSelect')?.value || "main";
        this.settings.showSeatedInWaitlist = !!document.getElementById('showSeatedInWaitlist')?.checked;
        this.settings.autoClearCompleted = !!document.getElementById('autoClearCompleted')?.checked;

        window.settingsManager.saveSettings(this.settings);
        this.showMessage('Settings saved successfully!', 'success');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will not affect your waitlist or history data.')) {
            this.settings = {
                restaurantName: "CoHost Restaurant",
                accentColor: "blue",
                avgDiningTime: 90,
                defaultRoom: "main",
                showSeatedInWaitlist: false,
                autoClearCompleted: false
            };

            window.settingsManager.saveSettings(this.settings);
            this.populateForm();
            this.showMessage('Settings reset to defaults!', 'success');
        }
    }

    async resetRooms() {
        const password = document.getElementById('settingsPassword')?.value || '';
        if (!password) {
            this.showMessage('Password is required to reset table configurations.', 'error');
            return;
        }
        if (!confirm('Reset all table configurations to default?')) return;

        try {
            const res = await fetch(`${API_BASE}/waitlist/reset-layout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken() || ''}`
                },
                body: JSON.stringify({ password })
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || 'Unable to reset layouts');

            localStorage.removeItem('cohost-rooms');
            this.showMessage('Table configurations reset to default.', 'success');
            window.location.reload();
        } catch (err) {
            this.showMessage(err.message || 'Failed to reset layouts.', 'error');
        }
    }

    async clearHistory() {
        const password = document.getElementById('settingsPassword')?.value || '';
        if (!password) {
            this.showMessage('Password is required to clear history.', 'error');
            return;
        }
        if (!confirm('Delete all completed/cancelled parties from history?')) return;

        try {
            const res = await fetch(`${API_BASE}/waitlist/history`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken() || ''}`
                },
                body: JSON.stringify({ password })
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload.error || 'Unable to clear history');
            this.showMessage('History cleared for this account.', 'success');
        } catch (err) {
            this.showMessage(err.message || 'Failed to clear history.', 'error');
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing message if any
        const existingMessage = document.querySelector('.settings-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `settings-message settings-message-${type}`;
        messageEl.textContent = message;

        // Add styles
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        if (type === 'success') {
            messageEl.style.backgroundColor = 'var(--success-color)';
        } else if (type === 'error') {
            messageEl.style.backgroundColor = 'var(--danger-color)';
        } else {
            messageEl.style.backgroundColor = 'var(--info-color)';
        }

        document.body.appendChild(messageEl);

        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on settings page
    if (document.getElementById('settingsForm')) {
        window.settingsPage = new SettingsPage();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Log out of CoHost on this browser?')) {
                if (typeof clearAuth === 'function') {
                    clearAuth(); // from config.js: clears token + user
                }
                window.location.href = 'login.html';
            }
        });
    }
});
