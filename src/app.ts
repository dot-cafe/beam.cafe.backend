import cors             from 'cors';
import express          from 'express';
import http             from 'http';
import {api}            from './api';
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
    app.use('/', api());
    log('API attached...');

    wrapHTTPServer(server);
    server.on('request', app);
    log('Websocket server attached...');

    server.listen(8080);
    log('App successfully launched');
})();
