import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export interface AuthRequest extends Request {
    user?: any;
<<<<<<< HEAD
    params: any;
    body: any;
    query: any;
    headers: any;
=======
>>>>>>> 3f64e6da120dd682c477398310e28aa34f10a743
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

<<<<<<< HEAD
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
=======
    jwt.verify(token, JWT_SECRET, (err, user) => {
>>>>>>> 3f64e6da120dd682c477398310e28aa34f10a743
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
