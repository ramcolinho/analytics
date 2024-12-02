const axios = require('axios');
const { MOCK_API_URL } = require('../config/config');

class AnalyticsService {
    async getInitialData() {
        try {
            const response = await axios.get(MOCK_API_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching initial data:', error.message);
            throw error;
        }
    }

    async updateData(data) {
        try {
            const response = await axios.post(MOCK_API_URL, data);
            return response.data;
        } catch (error) {
            console.error('Error updating data:', error.message);
            throw error;
        }
    }

    async editData(data) {
        try {
            const resp = await axios.get(MOCK_API_URL);
            const getSingleData = resp.data.find(
                (item) => 
                    item.additionalData.sessionId === data.additionalData.sessionId && 
                    item.additionalData.cardType === data.additionalData.cardType
            );

            if (getSingleData) {
                const response = await axios.put(`${MOCK_API_URL}/${getSingleData.id}`, data);
                return response.data;
            } else {
                const response = await axios.post(MOCK_API_URL, data);
                return response.data;
            }
        } catch (error) {
            console.error('Error editing data:', error.message);
            throw error;
        }
    }
}

module.exports = new AnalyticsService();
