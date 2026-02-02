
import axios from 'axios';
import jwt from 'jsonwebtoken';

async function verifyAPI() {
    const JWT_SECRET = 'your_jwt_secret_key';
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    console.log('--- Iniciando Verificación Técnica de la API ---');
    console.log('Token generado para la prueba.');

    try {
        console.log('1. Probando conexión con http://localhost:3000/api/otra-gestion...');
        const response = await axios.get('http://localhost:3000/api/otra-gestion', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Respuesta recibida:', response.status);
        console.log('Cantidad de registros encontrados:', response.data.length);
        console.log('Registros:', JSON.stringify(response.data, null, 2));

        if (response.data.length > 0) {
            console.log('✅ ÉXITO: El backend está devolviendo los datos correctamente.');
        } else {
            console.log('⚠️ ADVERTENCIA: La conexión es exitosa pero el array está vacío.');
        }
    } catch (error: any) {
        console.error('❌ ERROR de conexión:', error.message);
        if (error.response) {
            console.error('Status del error:', error.response.status);
            console.error('Data del error:', error.response.data);
        }
    }
}

verifyAPI();
