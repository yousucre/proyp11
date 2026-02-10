import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getLocalIpAddress } from './utils/ip';

import authRoutes from './routes/authRoutes';
import pqrRoutes from './routes/pqrRoutes';
import reportRoutes from './routes/reportRoutes';
import configRoutes from './routes/configRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import otraGestionRoutes from './routes/otraGestionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   MIDDLEWARES
======================= */
app.use(cors({
    origin: [
        'https://proyp11.web.app',
        'http://localhost:5173'
    ],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

/* =======================
   HEALTH CHECK (RENDER)
======================= */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'proyp11-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

/* =======================
   ROOT
======================= */
app.get('/', (req, res) => {
    res.send('PQR System Backend is running');
});

/* =======================
   ROUTES
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/pqr', pqrRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/otra-gestion', otraGestionRoutes);

/* =======================
   SERVER
======================= */
app.listen(PORT, () => {
    const ip = getLocalIpAddress();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on http://${ip}:${PORT}`);
});