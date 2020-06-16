import {Request} from 'express';

export const resolveClientIP = (req: Request): string | null => {
    return req.ip || req.socket.remoteAddress || null;
};
