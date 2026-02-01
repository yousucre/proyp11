import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

/**
 * MOTOR DE CORREO - VERSIÓN ECMAScript Modules (ESM)
 * Compatible con proyectos configurados con "type": "module"
 */

// 2. Inicializa el transporter con Gmail SMTP
// 3. Usa contraseña de aplicación de Google
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Puerto para SSL
    secure: true, // true para puerto 465
    auth: {
        user: 'gestionpqrs.soporte@gmail.com',
        pass: 'laiyxroxfewdwxcs' // Contraseña de aplicación
    },
    tls: {
        // Ayuda a evitar problemas en redes locales o firewalls que intercepten certificados
        rejectUnauthorized: false
    }
});

/**
 * 4. Verifica la conexión antes de enviar correos
 */
export const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ [MOTOR] Conexión establecida con éxito con smtp.gmail.com');
        return true;
    } catch (error) {
        // 5. Si falla, muestra el error exacto en consola
        console.error('❌ [ERROR MOTOR] Falló la verificación de conexión:');
        console.error(error.message);
        return false;
    }
};

/**
 * Función para enviar correos
 */
export const sendMail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: '"Soporte Gestión PQR" <gestionpqrs.soporte@gmail.com>',
            to,
            subject,
            html
        });
        console.log('📧 [ÉXITO] Correo enviado a:', to, '| MessageID:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ [ERROR ENVÍO] No se pudo enviar el correo:');
        console.error(error.message);
        throw error;
    }
};

// --- PRUEBAS PERTINENTES ---
// Verificamos si el archivo se está ejecutando directamente
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
    (async () => {
        console.log('🚀 Iniciando pruebas del motor de correo (ESM)...');
        const isReady = await verifyConnection();

        if (isReady) {
            console.log('📤 Ejecutando envío de prueba...');
            try {
                await sendMail(
                    'gestionpqrs.soporte@gmail.com',
                    'Prueba de Motor Node.js - Gestión PQR',
                    '<strong>El motor de correo está configurado y funcionando correctamente en modo ES Module.</strong>'
                );
            } catch (e) {
                // Error capturado en la función
            }
        }
    })();
}
