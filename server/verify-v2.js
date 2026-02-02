const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'admin_secret_123';

async function runAdvancedVerification() {
    try {
        console.log('--- ADVANCED VERIFICATION START ---');

        // 1. Login
        let token;
        try {
            const login = await axios.post(`${BASE_URL}/api/auth/login`, { password: PASSWORD });
            token = login.data.token;
            console.log('1. Login successful');
        } catch (e) {
            console.log('Login failed with new password, trying default...');
            const login = await axios.post(`${BASE_URL}/api/auth/login`, { password: 'admin123' });
            token = login.data.token;
            console.log('1. Login successful (fallback)');
        }

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Create PQR
        const pqrData = {
            tipo_identificacion: 'CC',
            numero_identificacion: '99999999',
            nombre_completo: 'Advanced Test User',
            tipo_pqr: 'Queja',
            asunto: 'Test Deletion',
            manual_radicado: `DEL-${Date.now()}`
        };
        const createRes = await axios.post(`${BASE_URL}/api/pqr`, pqrData, authHeaders);
        const pqrId = createRes.data.id;
        console.log(`2. PQR Created: ${createRes.data.radicado} (ID: ${pqrId})`);

        // 3. Update PQR with Nested Solicitante
        const updateData = {
            asunto: 'Updated Subject',
            solicitante: {
                nombre_completo: 'Updated Name',
                telefono: '555-1234'
            }
        };
        await axios.put(`${BASE_URL}/api/pqr/${pqrId}`, updateData, authHeaders);
        console.log('3. PQR Updated with nested solicitante');

        // Verify update
        const getRes = await axios.get(`${BASE_URL}/api/pqr/${pqrId}`, authHeaders);
        if (getRes.data.solicitante.nombre_completo === 'Updated Name') {
            console.log('   -> Nested update Verified');
        } else {
            console.error('   -> Nested update FAILED');
        }

        // 4. Create Actuacion
        await axios.post(`${BASE_URL}/api/pqr/${pqrId}/actuacion`, {
            tipo_actuacion: 'Seguimiento',
            observacion: 'Test observation'
        }, authHeaders);
        console.log('4. Actuacion Created');

        // Verify Actuacion
        const getActRes = await axios.get(`${BASE_URL}/api/pqr/${pqrId}`, authHeaders);
        if (getActRes.data.actuaciones && getActRes.data.actuaciones.length > 0) {
            console.log('   -> Actuacion Verified');
        } else {
            console.error('   -> Actuacion Verification FAILED');
        }

        // 5. Delete PQR
        await axios.delete(`${BASE_URL}/api/pqr/${pqrId}`, authHeaders);
        console.log('5. PQR Deleted');

        // Verify Delete
        try {
            await axios.get(`${BASE_URL}/api/pqr/${pqrId}`, authHeaders);
            console.error('   -> Delete Verification FAILED (PQR still exists)');
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log('   -> Delete Verified (404 Not Found)');
            } else {
                console.error('   -> Delete Verification Error:', e.message);
            }
        }

        console.log('--- VERIFICATION COMPLETE ---');

    } catch (error) {
        console.error('Verification FAILED:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

runAdvancedVerification();
