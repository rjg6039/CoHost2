// Global dark mode management
class DarkModeManager {
    constructor() {
        this.applyDarkModeImmediately();
        this.setupEventListeners();
    }

    applyDarkModeImmediately() {
        const savedMode = localStorage.getItem('cohost-dark-mode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldEnableDarkMode = savedMode ? JSON.parse(savedMode) : systemPrefersDark;

        if (shouldEnableDarkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateToggleButton(shouldEnableDarkMode);
            });
        } else {
            this.updateToggleButton(shouldEnableDarkMode);
        }
    }

    setupEventListeners() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupThemeToggle();
            });
        } else {
            this.setupThemeToggle();
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('cohost-dark-mode')) {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.disableDarkMode();
                }
            }
        });
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            this.updateToggleButton(isDarkMode);
        }
    }

    toggleDarkMode() {
        if (document.documentElement.classList.contains('dark-mode')) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
    }

    enableDarkMode() {
        document.documentElement.classList.add('dark-mode');
        this.updateToggleButton(true);
        localStorage.setItem('cohost-dark-mode', 'true');
    }

    disableDarkMode() {
        document.documentElement.classList.remove('dark-mode');
        this.updateToggleButton(false);
        localStorage.setItem('cohost-dark-mode', 'false');
    }

    updateToggleButton(isDarkMode) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
            themeToggle.title = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }
    }
}

// Initialize dark mode manager immediately
window.darkModeManager = new DarkModeManager();
