import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'gestionpqrs.soporte@gmail.com',
        pass: 'laiy xrox fewd wxcs'
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
    try {
        const info = await transporter.sendMail({
            from: '"Gestion PQR" <gestionpqrs.soporte@gmail.com>',
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback to stripped HTML if no text provided
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email: ', error);
        return false;
    }
};
