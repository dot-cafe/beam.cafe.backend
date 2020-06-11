import cors             from 'cors';
import express          from 'express';
import http             from 'http';
import * as path        from 'path';
import {api}            from './api';
import {config}         from './config';
import {log, LogLevel}  from './logging';
import {wrapHTTPServer} from './socket';

(async (): Promise<void> => {
    const dev = process.env.NODE_ENV === 'development';
    const server = http.createServer();
    const app = express();

    // Disable powered-by-message
    app.disable('x-powered-by');

    // Enable cors during development
    if (dev) {
        log('booting', {
            message: 'Starting app in development'
        }, LogLevel.INFO);

        app.use(cors());
    } else {
        log('booting', {
            message: 'Starting app in production'
        }, LogLevel.INFO);
    }

    // Serve template assets
    const templateAssets = path.resolve(__dirname, dev ? '../dist/ta' : '../ta');
    app.use('/ta', express.static(templateAssets));

    // Register api
    app.use(config.server.api, api());
    wrapHTTPServer(server);
    server.on('request', app);
    server.listen(config.server.port);

    log('booting', {
        message: 'Server successfully started launched.'
    }, LogLevel.INFO);
})();
