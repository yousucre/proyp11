
import axios from 'axios';

const API_URL = 'https://proyp11-backend.onrender.com/api';
const PASSWORD = 'Agente2025@';

async function verifyOtrasGestiones() {
    console.log('1. Logging in...');
    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            password: PASSWORD
        });
        token = loginRes.data.token;
        console.log('   Login successful. Token obtained.');
    } catch (error: any) {
        console.error('   Login failed:', error.message);
        return;
    }

    console.log('\n2. Fetching Otras Gestiones...');
    try {
        const res = await axios.get(`${API_URL}/otra-gestion`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Success! Found', res.data.length, 'records.');
        console.log('   First record:', res.data[0] || 'No records found');
    } catch (error: any) {
        console.error('   Failed to fetch Otras Gestiones:', error.message);
        if (error.response) console.error('   Status:', error.response.status, error.response.data);
    }

    console.log('\n3. Fetching Tipos Actividad...');
    try {
        const res = await axios.get(`${API_URL}/config/tipos-actividad`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Success! Found', res.data.length, 'activity types.');
        console.log('   Types:', res.data);
    } catch (error: any) {
        console.error('   Failed to fetch Tipos Actividad:', error.message);
        if (error.response) console.error('   Status:', error.response.status, error.response.data);
    }
}

verifyOtrasGestiones();
