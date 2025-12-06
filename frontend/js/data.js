// Sample data for the application
const sampleData = {
    waitlist: [
        {
            id: 1,
            name: "Johnson Family",
            size: 4,
            time: "16:30",
            phone: "555-0123",
            notes: "Celebrating anniversary",
            added: new Date(),
            handicap: false,
            highchair: false,
            window: false,
            state: "waiting",
            seatedTime: null,
            completedTime: null,
            tableId: null
        },
        {
            id: 2,
            name: "Smith Group",
            size: 6,
            time: "16:45",
            phone: "555-0456",
            notes: "High chairs needed",
            added: new Date(Date.now() - 300000),
            handicap: false,
            highchair: true,
            window: false,
            state: "waiting",
            seatedTime: null,
            completedTime: null,
            tableId: null
        },
        {
            id: 3,
            name: "Brown Party",
            size: 2,
            time: "17:00",
            phone: "555-0789",
            notes: "Window seat preferred",
            added: new Date(Date.now() - 600000),
            handicap: true,
            highchair: false,
            window: true,
            state: "waiting",
            seatedTime: null,
            completedTime: null,
            tableId: null
        }
    ],
    rooms: {
        // In the loadData method, update the sample data for main dining room
        main: {
            name: "Main Dining Room",
            width: 40,
            height: 30,
            tables: [
                // Section 1 - Top left cluster (2x2 tables with 1-block spacing)
                { id: 1, section: 1, number: 1, capacity: 4, x: 5, y: 5, shape: 'square', handicap: false, highchair: true, window: false, state: "ready" },
                { id: 2, section: 1, number: 2, capacity: 4, x: 8, y: 5, shape: 'square', handicap: false, highchair: false, window: true, state: "ready" },
                { id: 3, section: 1, number: 3, capacity: 4, x: 5, y: 8, shape: 'square', handicap: false, highchair: true, window: false, state: "ready" },
                { id: 4, section: 1, number: 4, capacity: 4, x: 8, y: 8, shape: 'square', handicap: false, highchair: false, window: false, state: "ready" },

                // Section 2 - Top right cluster
                { id: 5, section: 2, number: 1, capacity: 2, x: 20, y: 5, shape: 'circle', handicap: true, highchair: false, window: false, state: "ready" },
                { id: 6, section: 2, number: 2, capacity: 2, x: 23, y: 5, shape: 'circle', handicap: false, highchair: false, window: true, state: "ready" },
                { id: 7, section: 2, number: 3, capacity: 6, x: 20, y: 8, shape: 'horizontal', handicap: false, highchair: true, window: false, state: "seated", seatedParty: { id: 1, name: "Johnson Family", size: 4 } },

                // Section 3 - Bottom left
                { id: 8, section: 3, number: 1, capacity: 4, x: 5, y: 20, shape: 'square', handicap: false, highchair: false, window: false, state: "not-ready" },
                { id: 9, section: 3, number: 2, capacity: 4, x: 8, y: 20, shape: 'square', handicap: false, highchair: false, window: false, state: "ready" },

                // Section 4 - Bottom right
                { id: 10, section: 4, number: 1, capacity: 8, x: 20, y: 20, shape: 'horizontal', handicap: true, highchair: true, window: false, state: "ready" }
            ]
        },
        patio: {
            name: "Patio",
            tables: [
                { id: 6, section: 1, number: 1, capacity: 4, x: 100, y: 100, state: "ready", seatedParty: null, handicap: false, window: true, highchair: false },
                { id: 7, section: 1, number: 2, capacity: 2, x: 200, y: 100, state: "ready", seatedParty: null, handicap: false, window: true, highchair: false }
            ]
        },
        bar: {
            name: "Bar Area",
            tables: [
                { id: 8, section: 1, number: 1, capacity: 2, x: 50, y: 50, state: "seated", seatedParty: { id: 2, name: "Smith Group", size: 6 }, handicap: false, window: false, highchair: false },
                { id: 9, section: 1, number: 2, capacity: 2, x: 150, y: 50, state: "ready", seatedParty: null, handicap: false, window: false, highchair: false }
            ]
        },
        private: {
            name: "Private Room",
            tables: [
                { id: 10, section: 1, number: 1, capacity: 8, x: 150, y: 150, state: "not-ready", seatedParty: null, handicap: true, window: false, highchair: true }
            ]
        },
        lounge: {
            name: "Lounge",
            tables: [
                { id: 11, section: 1, number: 1, capacity: 4, x: 50, y: 50, state: "ready", seatedParty: null, handicap: false, window: true, highchair: false },
                { id: 12, section: 1, number: 2, capacity: 4, x: 150, y: 50, state: "ready", seatedParty: null, handicap: false, window: true, highchair: false }
            ]
        }
    },
    history: []
};

// Application state
let appState = {
    currentRoom: 'main',
    restaurantName: "CoHost Restaurant",
    waitlistSort: { field: 'time', direction: 'asc' }
};

// Initialize data
function initializeData() {
    const savedData = localStorage.getItem('cohost-data');
    if (savedData) {
        const data = JSON.parse(savedData);
        return data;
    }
    return sampleData;
}

// Save data to localStorage
function saveData(data) {
    localStorage.setItem('cohost-data', JSON.stringify(data));
}

