import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendPasswordEmail = async (email: string, password: string) => {
  try {
    await transporter.sendMail({
      from: `"ClientFy" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Tu Nueva Contraseña Segura',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; text-align: center;">Tu Nueva Contraseña</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="font-size: 24px; text-align: center; color: #34495e; font-family: monospace;">${password}</p>
            </div>
            <p style="color: #7f8c8d;">Esta contraseña ha sido generada de forma segura. Por favor, guárdala en un lugar seguro.</p>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #95a5a6; font-size: 12px;">Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    throw new Error('No se pudo enviar el email con la contraseña');
  }
};
