/**
 * Servicio de envío de correo utilizando SMTP.js (Inyección Directa).
 */

export const sendRecoveryEmail = async (to: string, token: string) => {
    const resetLink = `${window.location.origin}/#/reset-password?token=${token}`;

    const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #1e40af; text-align: center;">Recuperación de Contraseña</h2>
            <p>Usted ha solicitado restablecer su contraseña para el <strong>Sistema de Gestión PQR</strong>.</p>
            <p>Haga clic en el botón de abajo para elegir una nueva contraseña. Este enlace expirará en 1 hora.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    RESTABLECER CONTRASEÑA
                </a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">Este es un mensaje automático, por favor no responda.</p>
        </div>
    `;

    // Intentamos cargar la librería SMTP.js de forma dinámica para evitar errores de compilación
    if (!(window as any).Email) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://smtpjs.com/v3/smtp.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error("No se pudo cargar el motor de correo. Verifique su internet o desactive bloqueadores."));
            document.head.appendChild(script);
        });
    }

    const smtp = (window as any).Email;
    if (!smtp) {
        throw new Error("El sistema de correo no está disponible.");
    }

    try {
        const result = await smtp.send({
            Host: "smtp.gmail.com",
            Username: "gestionpqrs.soporte@gmail.com",
            Password: "laiy xrox fewd wxcs",
            To: to,
            From: "gestionpqrs.soporte@gmail.com",
            Subject: "Recuperación de Contraseña - Gestión PQR",
            Body: body
        });

        if (result === "OK") return true;
        throw new Error(result);
    } catch (e: any) {
        console.error("Error en servicio de correo:", e);
        throw new Error("Error al enviar el correo: " + (e.message || "Servicio no disponible"));
    }
};
