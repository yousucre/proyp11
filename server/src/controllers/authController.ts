import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

/* =========================
   SETUP INICIAL DEL SISTEMA
   ========================= */
export const setup = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'La contraseña es obligatoria' });
    }

    const config = await prisma.systemConfig.findFirst();

    if (config && config.first_setup_done) {
      return res.status(400).json({
        message: 'El sistema ya fue configurado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (config) {
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          hashed_password: hashedPassword,
          first_setup_done: true
        }
      });
    } else {
      await prisma.systemConfig.create({
        data: {
          hashed_password: hashedPassword,
          first_setup_done: true,
          plazo_peticion: 15,
          plazo_queja: 15,
          plazo_reclamo: 15,
          plazo_recurso: 10,
          prefijo_radicado: 'PQR',
          backup_automatico: false,
          backup_frecuencia: 7
        }
      });
    }

    return res.status(200).json({
      message: 'Configuración inicial completada correctamente'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/* =========
   LOGIN
   ========= */
export const login = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    const config = await prisma.systemConfig.findFirst();

    if (!config || !config.hashed_password) {
      return res.status(400).json({
        message: 'El sistema no ha sido configurado'
      });
    }

    const valid = await bcrypt.compare(password, config.hashed_password);

    if (!valid) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { system: true },
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      token,
      firstSetup: config.first_setup_done
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
