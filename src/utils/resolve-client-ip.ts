import {Request} from 'express';

export const resolveClientIp = (req: Request): string | null => {
    return req.ip || req.socket.remoteAddress || null;
};
