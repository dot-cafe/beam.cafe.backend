import cors             from 'cors';
import express          from 'express';
import http             from 'http';
import {api}            from './api';
import {config}         from './config';
import {log}            from './logging';
import {wrapHTTPServer} from './socket';

(async (): Promise<void> => {
    const server = http.createServer();
    const app = express();

    // Disable powered-by-message
    app.disable('x-powered-by');

    // Enable cors during development
    if (process.env.NODE_ENV === 'development') {
        log('Starting app in development mode...');
        app.use(cors());
    } else {
        log('Starting app in production...');
    }

    // Register api
    app.use(config.server.api, api());
    log('API attached...');

    wrapHTTPServer(server);
    server.on('request', app);
    log('WebSocket server attached...');

    server.listen(config.server.port);
    log('App successfully launched');
})();
