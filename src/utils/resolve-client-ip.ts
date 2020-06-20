import http from 'http';

export const resolveClientIp = (req: http.IncomingMessage): string | null => {
    const xForwardedForHeader = req.headers['x-forwarded-for'];

    if (xForwardedForHeader) {
        return Array.isArray(xForwardedForHeader) ? xForwardedForHeader[0] : xForwardedForHeader;
    }

    return req.socket.remoteAddress || null;
};
