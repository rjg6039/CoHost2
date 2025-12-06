// Global dark mode management
class DarkModeManager {
    constructor() {
        // Apply dark mode immediately before any rendering
        this.applyDarkModeImmediately();
        this.setupEventListeners();
    }

    applyDarkModeImmediately() {
        // Check for saved theme preference or system preference
        const savedMode = localStorage.getItem('cohost-dark-mode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Use saved mode if available, otherwise use system preference
        const shouldEnableDarkMode = savedMode ? JSON.parse(savedMode) : systemPrefersDark;

        // Apply to HTML element immediately
        if (shouldEnableDarkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }

        // Prevent transition during initial load to avoid flash
        document.documentElement.style.setProperty('--transition-disable', 'none');

        // Update toggle button once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateToggleButton(shouldEnableDarkMode);
                // Re-enable transitions after a short delay
                setTimeout(() => {
                    document.documentElement.style.removeProperty('--transition-disable');
                }, 50);
            });
        } else {
            this.updateToggleButton(shouldEnableDarkMode);
            setTimeout(() => {
                document.documentElement.style.removeProperty('--transition-disable');
            }, 50);
        }
    }

    setupEventListeners() {
        // Wait for DOM to be fully loaded before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupThemeToggle();
            });
        } else {
            this.setupThemeToggle();
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only follow system preference if no user preference is saved
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
        // Remove any existing event listeners first
        const existingToggle = document.getElementById('themeToggle');
        if (existingToggle) {
            const newToggle = existingToggle.cloneNode(true);
            existingToggle.parentNode.replaceChild(newToggle, existingToggle);
        }

        // Set up new event listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });

            // Ensure the button has the correct icon
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            this.updateToggleButton(isDarkMode);
        }
    }

    toggleDarkMode() {
        // Disable transitions during toggle to prevent flash
        document.documentElement.style.setProperty('--transition-disable', 'none');

        if (document.documentElement.classList.contains('dark-mode')) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }

        // Re-enable transitions after toggle
        setTimeout(() => {
            document.documentElement.style.removeProperty('--transition-disable');
        }, 300);
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

// Initialize dark mode manager immediately when script loads
window.darkModeManager = new DarkModeManager();
