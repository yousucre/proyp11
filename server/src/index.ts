import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"; // Pon todos los imports arriba
import { getLocalIpAddress } from './utils/ip';

dotenv.config();

const app = express();

// --- CONFIGURACIÓN DE CORS UNIFICADA ---
const allowedOrigins = [
    "https://proyp11.web.app",
    "https://proyp11.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:4173",
    ...(process.env.FRONTEND_URL?.split(',') || [])
].map(origin => origin.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (como Postman o el propio servidor)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("Origen bloqueado por CORS:", origin); // Esto te ayudará a debuguear en los logs de Render
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
}));
// ---------------------------------------

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.send('PQR System Backend is running');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Rutas
import authRoutes from './routes/authRoutes';
import pqrRoutes from './routes/pqrRoutes';
import reportRoutes from './routes/reportRoutes';
import configRoutes from './routes/configRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import otraGestionRoutes from './routes/otraGestionRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/pqr', pqrRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/otra-gestion', otraGestionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    const ip = getLocalIpAddress();
    console.log(`Server running on port ${PORT}`);
});
