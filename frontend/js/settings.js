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

        // Data management buttons
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importDataBtn').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearData();
        });

        // Real-time updates for better UX
        document.getElementById('restaurantNameInput').addEventListener('input', (e) => {
            this.settings.restaurantName = e.target.value;
            window.settingsManager.saveSettings(this.settings);
        });

        document.getElementById('accentColor').addEventListener('change', (e) => {
            this.settings.accentColor = e.target.value;
            window.settingsManager.saveSettings(this.settings);
        });

        document.getElementById('groqApiKey').addEventListener('input', (e) => {
            this.settings.groqApiKey = e.target.value;
            // Don't save on every keystroke for API key for security
        });
    }

    populateForm() {
        document.getElementById('restaurantNameInput').value = this.settings.restaurantName;
        document.getElementById('accentColor').value = this.settings.accentColor;
        document.getElementById('groqApiKey').value = this.settings.groqApiKey;
    }

    saveSettingsFromForm() {
        this.settings.restaurantName = document.getElementById('restaurantNameInput').value;
        this.settings.accentColor = document.getElementById('accentColor').value;
        this.settings.groqApiKey = document.getElementById('groqApiKey').value;

        window.settingsManager.saveSettings(this.settings);
        this.showMessage('Settings saved successfully!', 'success');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will not affect your waitlist or history data.')) {
            this.settings = {
                restaurantName: "CoHost Restaurant",
                accentColor: "blue",
                groqApiKey: ""
            };

            window.settingsManager.saveSettings(this.settings);
            this.populateForm();
            this.showMessage('Settings reset to defaults!', 'success');
        }
    }

    exportData() {
        const data = {
            waitlist: this.loadData().waitlist || [],
            history: this.loadData().history || [],
            rooms: this.loadData().rooms || {},
            settings: this.settings
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cohost-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage('Data exported successfully!', 'success');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = event => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    if (confirm('This will replace all existing data. Are you sure you want to continue?')) {
                        // Save the imported data
                        localStorage.setItem('cohost-data', JSON.stringify({
                            waitlist: importedData.waitlist || [],
                            history: importedData.history || [],
                            rooms: importedData.rooms || {}
                        }));

                        // Update settings if they exist in imported data
                        if (importedData.settings) {
                            window.settingsManager.saveSettings(importedData.settings);
                            this.settings = importedData.settings;
                            this.populateForm();
                        }

                        this.showMessage('Data imported successfully!', 'success');
                    }
                } catch (error) {
                    this.showMessage('Error importing data: Invalid file format', 'error');
                }
            };

            reader.readAsText(file);
        };

        input.click();
    }

    clearData() {
        if (confirm('Are you sure you want to clear ALL data? This will permanently delete your waitlist, history, and table arrangements. This action cannot be undone.')) {
            localStorage.removeItem('cohost-data');
            this.showMessage('All data cleared successfully!', 'success');
        }
    }

    loadData() {
        const savedData = localStorage.getItem('cohost-data');
        return savedData ? JSON.parse(savedData) : { waitlist: [], history: [], rooms: {} };
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
});
