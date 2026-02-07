import { Request, Response } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;


export const login = async (req: Request, res: Response) => {
    const { password } = req.body;
    const fs = require('fs');
    const path = require('path');

    const logPath = path.join(__dirname, '../../login-debug.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);

    log(`Attempting login with password length: ${password?.length}`);

    try {
        const config = await prisma.systemConfig.findFirst();
        log(`Config found: ${!!config}`);

        if (!config) {
            log('No config, returning firstSetup');
            return res.status(200).json({ firstSetup: true, message: 'System not configured' });
        }

        if (!config.hashed_password && !password) {
            log('No hashed password and no password provided, returning firstSetup');
            return res.status(200).json({ firstSetup: true });
        }

        // Check if there's a stored password
        if (config.hashed_password) {
            log('Comparing passwords...');
            const isValid = await bcrypt.compare(password, config.hashed_password);
            log(`Password valid: ${isValid}`);

            if (!isValid) {
                log('Invalid password');
                return res.status(401).json({ error: 'Invalid password' });
            }
        } else {
            log('System error: no password configured but config exists');
            return res.status(401).json({ error: 'System error: no password configured' });
        }

        log('Login successful, generating token');
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    } catch (error: any) {
        log(`Error: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const setup = async (req: Request, res: Response) => {
    const { password, ...configData } = req.body;

    try {
        const count = await prisma.systemConfig.count();
        if (count > 0) {
            // Already setup, use update if authenticated (middleware should protect this route ideally, but this is 'setup')
            // For now, allow re-setup only if authenticated or check inside
            return res.status(400).json({ error: 'Already setup' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.systemConfig.create({
            data: {
                ...configData,
                hashed_password: hashedPassword,
                first_setup_done: true,
                plazo_peticion: 15, // defaults
                plazo_queja: 15,
                plazo_reclamo: 15,
                plazo_recurso: 10,
                prefijo_radicado: 'PQR',
                backup_automatico: true,
                backup_frecuencia: 7
            }
        });

        res.json({ message: 'Setup complete' });
    } catch (e) {
        res.status(500).json({ error: 'Setup failed' });
    }
};

import crypto from 'crypto';
import { sendEmail } from '../utils/mailer';

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        const config = await prisma.systemConfig.findFirst();
        if (!config || (config.recovery_email_1 !== email && config.recovery_email_2 !== email)) {
            return res.status(400).json({ error: 'Email no registrado para recuperación' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour

        // Clean old tokens
        await prisma.recoveryToken.deleteMany({ where: { email } });

        await prisma.recoveryToken.create({
            data: {
                token,
                email,
                expires
            }
        });

        const resetLink = `${req.headers.origin}/#/reset-password?token=${token}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #1e40af; text-align: center;">Recuperación de Contraseña</h2>
                <p>Usted ha solicitado restablecer su contraseña.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        RESTABLECER CONTRASEÑA
                    </a>
                </div>
                <p>Si no solicitó esto, ignore este correo.</p>
            </div>
        `;

        const text = `
Recuperación de Contraseña

Usted ha solicitado restablecer su contraseña.

Para continuar, copie y pegue el siguiente enlace en su navegador:
${resetLink}

Si no solicitó esto, ignore este correo.
        `;

        const sent = await sendEmail(email, 'Recuperación de Contraseña', html, text);
        if (sent) {
            res.json({ message: 'Correo enviado' });
        } else {
            res.status(500).json({ error: 'Error al enviar correo' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error en recuperación' });
    }
};

export const verifyToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    try {
        const record = await prisma.recoveryToken.findUnique({
            where: { token }
        });

        if (!record) {
            return res.status(400).json({ valid: false, error: 'Token no válido' });
        }

        if (new Date() > new Date(record.expires)) {
            await prisma.recoveryToken.delete({ where: { id: record.id } });
            return res.status(400).json({ valid: false, error: 'Token expirado' });
        }

        res.json({ valid: true, email: record.email });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error verificando token' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body;
    try {
        const record = await prisma.recoveryToken.findUnique({
            where: { token }
        });

        if (!record) {
            return res.status(400).json({ error: 'Token no válido' });
        }

        if (new Date() > new Date(record.expires)) {
            await prisma.recoveryToken.delete({ where: { id: record.id } });
            return res.status(400).json({ error: 'Token expirado' });
        }

        const config = await prisma.systemConfig.findFirst();
        if (!config) {
            return res.status(500).json({ error: 'Configuración del sistema no encontrada' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.systemConfig.update({
            where: { id: config.id },
            data: { hashed_password: hashedPassword }
        });

        await prisma.recoveryToken.delete({ where: { id: record.id } });

        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al restablecer contraseña' });
    }
};
