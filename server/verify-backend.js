const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'admin_secret_123';

async function runVerification() {
    try {
        console.log('1. Checking Health...');
        const health = await axios.get(BASE_URL);
        console.log('Health:', health.data);

        console.log('2. Setting up (idempotent)...');
        try {
            await axios.post(`${BASE_URL}/api/auth/setup`, {
                password: PASSWORD,
                plazo_peticion: 15,
                plazo_queja: 15
            });
            console.log('Setup complete');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('Already set up');
            } else {
                // If it fails for other reasons, maybe it was already set up with diff password or error
                console.log('Setup skipped or failed:', e.message);
            }
        }

        console.log('3. Logging in...');
        let token;
        try {
            const login = await axios.post(`${BASE_URL}/api/auth/login`, { password: PASSWORD });
            token = login.data.token;
            console.log('Login successful. Token acquired.');
        } catch (e) {
            console.error('Login failed. Using default password?');
            // Try default if my setup failed because it was already setup
            try {
                const login = await axios.post(`${BASE_URL}/api/auth/login`, { password: 'admin123' }); // Previous try
                token = login.data.token;
                console.log('Login successful with fallback password.');
            } catch (ex) {
                console.error('Login failed completely');
                process.exit(1);
            }
        }

        console.log('4. Creating PQR...');
        const pqrData = {
            tipo_identificacion: 'CC',
            numero_identificacion: '123456789',
            nombre_completo: 'Test User',
            email: 'test@example.com',
            tipo_pqr: 'Peticion',
            asunto: 'Test PQR',
            canal_recepcion: 'Web',
            manual_radicado: `TEST-${Date.now()}`
        };

        const createRes = await axios.post(`${BASE_URL}/api/pqr`, pqrData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('PQR Created:', createRes.data.radicado);

        console.log('5. Listing PQRs...');
        const listRes = await axios.get(`${BASE_URL}/api/pqr`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Total PQRs:', listRes.data.length);
        console.log('Verification SUCCESS');

    } catch (error) {
        console.error('Verification FAILED:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

runVerification();
