import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLocalIpAddress } from './utils/ip';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    ...(process.env.FRONTEND_URL?.split(',') || []),
    'http://localhost:5173', // Local Vite development
    'http://localhost:4173'  // Local Vite preview
].filter(Boolean).map(origin => origin.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase limit for PDFs

app.get('/', (req, res) => {
    res.send('PQR System Backend is running');
});

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

app.listen(PORT, () => {
    const ip = getLocalIpAddress();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on http://${ip}:${PORT}`);
});
