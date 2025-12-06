// Standardized Analytics Data Structure for CoHost Restaurant - Fixed Version
const analyticsSampleData = {
    "metadata": {
        "generatedAt": "2024-01-20T12:00:00Z",
        "location": "CoHost Restaurant",
        "dataVersion": "1.1",
        "timeRange": "30 days"
    },
    "rooms": [
        {
            "roomId": "main",
            "roomName": "Main Dining Room",
            "tables": 12,
            "metrics": {
                "occupied": 9,
                "available": 3,
                "turnoverRate": 2.3,
                "avgOccupancy": 75,
                "revenuePerTable": 45.50
            },
            "traffic": [
                {"time": "17:00", "parties": 4, "avgSize": 3.2, "avgDuration": 85},
                {"time": "18:00", "parties": 7, "avgSize": 3.5, "avgDuration": 95},
                {"time": "19:00", "parties": 10, "avgSize": 4.1, "avgDuration": 105},
                {"time": "20:00", "parties": 8, "avgSize": 3.8, "avgDuration": 90},
                {"time": "21:00", "parties": 5, "avgSize": 2.9, "avgDuration": 75}
            ]
        },
        {
            "roomId": "patio",
            "roomName": "Patio",
            "tables": 8,
            "metrics": {
                "occupied": 6,
                "available": 2,
                "turnoverRate": 1.8,
                "avgOccupancy": 65,
                "revenuePerTable": 38.20
            },
            "traffic": [
                {"time": "17:00", "parties": 2, "avgSize": 2.5, "avgDuration": 70},
                {"time": "18:00", "parties": 4, "avgSize": 3.0, "avgDuration": 80},
                {"time": "19:00", "parties": 5, "avgSize": 3.2, "avgDuration": 85},
                {"time": "20:00", "parties": 3, "avgSize": 2.8, "avgDuration": 75}
            ]
        },
        {
            "roomId": "bar",
            "roomName": "Bar Area",
            "tables": 6,
            "metrics": {
                "occupied": 5,
                "available": 1,
                "turnoverRate": 3.2,
                "avgOccupancy": 83,
                "revenuePerTable": 28.75
            },
            "traffic": [
                {"time": "16:00", "parties": 3, "avgSize": 2.1, "avgDuration": 45},
                {"time": "17:00", "parties": 5, "avgSize": 2.3, "avgDuration": 50},
                {"time": "18:00", "parties": 4, "avgSize": 2.2, "avgDuration": 48},
                {"time": "19:00", "parties": 6, "avgSize": 2.4, "avgDuration": 52}
            ]
        }
    ],
    "dailyStats": [
        {"date": "2024-01-01", "guests": 245, "parties": 83, "turnoverRate": 2.4, "avgWait": 9.5, "revenue": 3785},
        {"date": "2024-01-02", "guests": 268, "parties": 91, "turnoverRate": 2.6, "avgWait": 8.9, "revenue": 4120},
        {"date": "2024-01-03", "guests": 192, "parties": 65, "turnoverRate": 2.1, "avgWait": 12.3, "revenue": 2950},
        {"date": "2024-01-04", "guests": 305, "parties": 104, "turnoverRate": 2.8, "avgWait": 7.8, "revenue": 4680},
        {"date": "2024-01-05", "guests": 412, "parties": 138, "turnoverRate": 3.1, "avgWait": 15.2, "revenue": 6340},
        {"date": "2024-01-06", "guests": 398, "parties": 135, "turnoverRate": 3.0, "avgWait": 14.8, "revenue": 6120},
        {"date": "2024-01-07", "guests": 285, "parties": 97, "turnoverRate": 2.7, "avgWait": 10.5, "revenue": 4380},
        {"date": "2024-01-08", "guests": 234, "parties": 79, "turnoverRate": 2.3, "avgWait": 11.2, "revenue": 3600},
        {"date": "2024-01-09", "guests": 276, "parties": 94, "turnoverRate": 2.6, "avgWait": 9.8, "revenue": 4240},
        {"date": "2024-01-10", "guests": 312, "parties": 106, "turnoverRate": 2.9, "avgWait": 8.4, "revenue": 4800},
        {"date": "2024-01-11", "guests": 289, "parties": 98, "turnoverRate": 2.7, "avgWait": 10.1, "revenue": 4450},
        {"date": "2024-01-12", "guests": 401, "parties": 136, "turnoverRate": 3.0, "avgWait": 16.3, "revenue": 6170},
        {"date": "2024-01-13", "guests": 425, "parties": 142, "turnoverRate": 3.2, "avgWait": 17.1, "revenue": 6540},
        {"date": "2024-01-14", "guests": 298, "parties": 101, "turnoverRate": 2.8, "avgWait": 11.8, "revenue": 4580},
        {"date": "2024-01-15", "guests": 267, "parties": 90, "turnoverRate": 2.5, "avgWait": 9.3, "revenue": 4100},
        {"date": "2024-01-16", "guests": 294, "parties": 100, "turnoverRate": 2.8, "avgWait": 10.7, "revenue": 4520},
        {"date": "2024-01-17", "guests": 328, "parties": 111, "turnoverRate": 3.0, "avgWait": 8.9, "revenue": 5040},
        {"date": "2024-01-18", "guests": 356, "parties": 120, "turnoverRate": 3.1, "avgWait": 12.5, "revenue": 5470},
        {"date": "2024-01-19", "guests": 389, "parties": 132, "turnoverRate": 3.2, "avgWait": 14.2, "revenue": 5980},
        {"date": "2024-01-20", "guests": 415, "parties": 140, "turnoverRate": 3.3, "avgWait": 16.8, "revenue": 6380}
    ],
    "summary": {
        "totalGuests": 6289,
        "totalParties": 2135,
        "avgWait": 11.8,
        "peakHour": "19:00",
        "avgPartySize": 2.95,
        "totalRevenue": 96540,
        "avgTurnover": 2.7,
        "busiestDay": "Saturday",
        "avgOccupancy": 74
    },
    "hourlyAverages": {
        "16:00": { "parties": 8, "avgSize": 2.2, "occupancy": 45 },
        "17:00": { "parties": 15, "avgSize": 3.1, "occupancy": 68 },
        "18:00": { "parties": 22, "avgSize": 3.4, "occupancy": 82 },
        "19:00": { "parties": 28, "avgSize": 3.6, "occupancy": 91 },
        "20:00": { "parties": 24, "avgSize": 3.3, "occupancy": 85 },
        "21:00": { "parties": 16, "avgSize": 2.8, "occupancy": 62 },
        "22:00": { "parties": 9, "avgSize": 2.4, "occupancy": 38 }
    }
};

// Make available globally with proper error handling
if (typeof window !== 'undefined') {
    try {
        window.analyticsSampleData = analyticsSampleData;
        console.log("[AnalyticsData] Sample data loaded successfully with",
                   analyticsSampleData.dailyStats.length, "daily entries");
    } catch (error) {
        console.error("[AnalyticsData] Failed to attach sample data to window:", error);
        // Create fallback empty structure
        window.analyticsSampleData = {
            metadata: { generatedAt: new Date().toISOString(), dataVersion: "1.1" },
            rooms: [],
            dailyStats: [],
            summary: { totalGuests: 0, totalParties: 0, avgWait: 0 },
            hourlyAverages: {}
        };
    }
} else {
    console.error("[AnalyticsData] Window object not available");
}
