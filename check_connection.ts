
import axios from 'axios';

const API_URL = 'https://proyp11-backend.onrender.com/api';
const PASSWORD = 'Agente2025@';

async function verifyConnection() {
    console.log('1. Testing Connection to Backend Root...');
    try {
        const rootRes = await axios.get('https://proyp11-backend.onrender.com/');
        console.log('   Create Success! Backend is reachable:', rootRes.data);
    } catch (error: any) {
        console.error('   Failed to reach backend root:', error.message);
        return;
    }

    console.log('\n2. Testing Login (Backend -> Database Connection)...');
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            password: PASSWORD
        });

        if (loginRes.data.token) {
            console.log('   Success! Login successful, token received.');
            console.log('   Token:', loginRes.data.token.substring(0, 20) + '...');
        } else {
            console.log('   Login failed. Response:', loginRes.data);
        }
    } catch (error: any) {
        console.error('   Login request failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

verifyConnection();
