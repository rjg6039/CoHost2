// Corrected Settings Manager with Event-Based API
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        // Apply settings immediately
        this.applyAllSettings();

        // Listen for storage events to sync settings across tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'cohost-settings') {
                this.settings = this.loadSettings();
                this.applyAllSettings();
                // Dispatch event for other components
                this.dispatchSettingsChange();
            }
        });

        // Initialize event system
        this.setupEventSystem();
    }

    setupEventSystem() {
        // Create event system for settings changes
        window.settingsManager = {
            currentSettings: this.settings,
            onSettingsChange: (callback) => {
                if (typeof callback === 'function') {
                    document.addEventListener('settingsUpdated', (e) => callback(e.detail));
                }
            },
            updateSettings: (newSettings) => {
                window.settingsManager.currentSettings = newSettings;
                localStorage.setItem('cohost-settings', JSON.stringify(newSettings));
                document.dispatchEvent(new CustomEvent('settingsUpdated', { detail: newSettings }));
            },
            loadSettings: () => {
                const stored = localStorage.getItem('cohost-settings');
                if (stored) window.settingsManager.currentSettings = JSON.parse(stored);
                return window.settingsManager.currentSettings;
            },
            getRestaurantName: () => {
                return window.settingsManager.currentSettings?.restaurantName || "CoHost Restaurant";
            },
            getAccentColor: () => {
                return window.settingsManager.currentSettings?.accentColor || "blue";
            }
        };
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('cohost-settings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }

        // Default settings
        return {
            restaurantName: "CoHost Restaurant",
            accentColor: "blue",
            avgDiningTime: 90,
            defaultRoom: "main",
            showSeatedInWaitlist: false,
            autoClearCompleted: false
        };
    }

    saveSettings(settings = null) {
        if (settings) {
            this.settings = settings;
        }
        localStorage.setItem('cohost-settings', JSON.stringify(this.settings));

        // Update the global object
        if (window.settingsManager) {
            window.settingsManager.currentSettings = this.settings;
        }

        // Trigger events
        this.dispatchSettingsChange();
        this.applyAllSettings();
    }

    dispatchSettingsChange() {
        document.dispatchEvent(new CustomEvent('settingsUpdated', {
            detail: this.settings
        }));
    }

    applyAllSettings() {
        this.applyRestaurantName();
        this.applyAccentColor();
        this.applyPageTitle();
    }

    applyRestaurantName() {
        const restaurantNameElements = document.querySelectorAll('#restaurantName');
        restaurantNameElements.forEach(element => {
            element.textContent = this.settings.restaurantName;
        });
    }

    applyAccentColor() {
        const accentColor = this.settings.accentColor;
        const root = document.documentElement;

        // Remove existing accent color classes
        root.classList.remove('accent-blue', 'accent-green', 'accent-purple', 'accent-red', 'accent-orange', 'accent-teal');

        // Add new accent color class
        root.classList.add(`accent-${accentColor}`);

        // Update CSS variables based on accent color
        this.updateAccentColorVariables(accentColor);
    }

    updateAccentColorVariables(color) {
        const root = document.documentElement;
        const colorMap = {
            blue: { light: '#1e3a8a', dark: '#3b82f6' },
            green: { light: '#059669', dark: '#10b981' },
            purple: { light: '#7c3aed', dark: '#8b5cf6' },
            red: { light: '#dc2626', dark: '#ef4444' },
            orange: { light: '#ea580c', dark: '#f97316' },
            teal: { light: '#0d9488', dark: '#14b8a6' }
        };

        const colors = colorMap[color] || colorMap.blue;
        const isDarkMode = document.documentElement.classList.contains('dark-mode');

        if (isDarkMode) {
            root.style.setProperty('--primary-color', colors.dark);
            root.style.setProperty('--primary-hover', this.lightenColor(colors.dark, 20));
        } else {
            root.style.setProperty('--primary-color', colors.light);
            root.style.setProperty('--primary-hover', this.darkenColor(colors.light, 20));
        }
    }

    applyPageTitle() {
        document.title = `CoHost - ${this.settings.restaurantName}`;
    }

    lightenColor(hex, percent) {
        // Simplified color manipulation
        return hex;
    }

    darkenColor(hex, percent) {
        // Simplified color manipulation
        return hex;
    }

    // Public API methods
    getRestaurantName() {
        return this.settings.restaurantName;
    }

    getAccentColor() {
        return this.settings.accentColor;
    }

    // Event listener registration with safety check
    onSettingsChange(callback) {
        if (typeof callback === 'function') {
            document.addEventListener('settingsUpdated', (e) => {
                console.log("[SettingsManager] Settings changed event received");
                callback(e.detail);
            });
        } else {
            console.warn("⚠️ settingsManager.onSettingsChange: callback is not a function");
        }
    }
}

// Initialize global settings manager
window.settingsManager = new SettingsManager();

// Also listen for the custom settings changed event
window.addEventListener('settingsUpdated', (e) => {
    console.log("[Global] Settings updated event caught");
    if (window.settingsManager) {
        window.settingsManager.settings = e.detail;
        window.settingsManager.applyAllSettings();
    }
});

console.log("[SettingsManager] Initialized successfully");
