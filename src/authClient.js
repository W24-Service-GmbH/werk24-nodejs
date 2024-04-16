class AuthClient {

    constructor(token) {
        this.apiToken = token;
    }

    getAuthHeaders() {
        return { 'Authorization': 'Token ' + this.apiToken };
    }
}

module.exports = {AuthClient};