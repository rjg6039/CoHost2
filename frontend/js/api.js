// API service for backend communication
class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const token = getAuthToken();
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(email, password, restaurantName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, restaurantName })
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Waitlist endpoints
    async getWaitlist() {
        return this.request('/waitlist');
    }

    async addParty(partyData) {
        return this.request('/waitlist', {
            method: 'POST',
            body: JSON.stringify(partyData)
        });
    }

    async updatePartyState(partyId, stateData) {
        return this.request(`/waitlist/${partyId}/state`, {
            method: 'PATCH',
            body: JSON.stringify(stateData)
        });
    }

    async getHistory(days = 30) {
        return this.request(`/waitlist/history?days=${days}`);
    }

    // Analytics endpoints
    async getAnalyticsSummary(days = 30) {
        return this.request(`/analytics/summary?days=${days}`);
    }

    async getAnalyticsInsights(days = 30) {
        return this.request(`/analytics/insights?days=${days}`);
    }
}

// Global API instance
window.apiService = new ApiService();
