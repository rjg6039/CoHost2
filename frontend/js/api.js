// API service for backend communication
class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        return apiRequest(endpoint, options);
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
}

window.apiService = new ApiService();
