// Core application state and initialization
class CoHostApp {
    constructor() {
        this.state = {
            currentRoom: 'main',
            isDarkMode: false,
            restaurantName: "CoHost Restaurant",
            accentColor: "blue"
        };

        this.waitlist = [];
        this.history = [];
        this.rooms = {
            main: { name: "Main Dining Room", tables: [] },
            patio: { name: "Patio", tables: [] },
            bar: { name: "Bar Area", tables: [] },
            private: { name: "Private Dining", tables: [] }
        };

        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateDisplay();
    }

    loadData() {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem('cohost-data');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
        } else {
            this.initializeSampleData();
        }
    }

    initializeSampleData() {
        this.waitlist = [
            { id: 1, name: "Johnson Family", size: 4, time: "16:30", phone: "555-0123", notes: "Celebrating anniversary", added: new Date() },
            { id: 2, name: "Smith Group", size: 6, time: "16:45", phone: "555-0456", notes: "High chairs needed", added: new Date() }
        ];

        this.rooms.main.tables = [
            { id: 1, number: 1, capacity: 4, x: 50, y: 50, state: "ready" },
            { id: 2, number: 2, capacity: 4, x: 150, y: 50, state: "ready" }
        ];
    }

    saveData() {
        localStorage.setItem('cohost-data', JSON.stringify({
            waitlist: this.waitlist,
            history: this.history,
            rooms: this.rooms,
            state: this.state
        }));
    }
}

const app = new CoHostApp();
