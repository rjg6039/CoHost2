// Minimal data bootstrap for room layouts only (no local waitlist/history persistence)
const sampleData = {
    rooms: {
        main: { name: "Main Dining Room", tables: [] }
    }
};

// Application state
let appState = {
    currentRoom: 'main',
    restaurantName: "CoHost Restaurant",
    waitlistSort: { field: 'time', direction: 'asc' }
};

// Initialize data (rooms only, will be replaced by server list)
function initializeData() {
    try {
        const savedData = localStorage.getItem('cohost-rooms');
        if (savedData) {
            const data = JSON.parse(savedData);
            return {
                rooms: data.rooms || sampleData.rooms
            };
        }
    } catch (_) {}
    return { rooms: sampleData.rooms };
}

// Save rooms to localStorage without touching parties/history
function saveData(data) {
    const payload = { rooms: data.rooms || sampleData.rooms };
    localStorage.setItem('cohost-rooms', JSON.stringify(payload));
}

