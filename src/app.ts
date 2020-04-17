import cors             from 'cors';
import express          from 'express';
import http             from 'http';
import {api}            from './api';
import {wrapHTTPServer} from './socket';

(async (): Promise<void> => {
    const server = http.createServer();
    const app = express();

    // Disable powered-by-message
    app.disable('x-powered-by');

    // Enable cors during development
    if (process.env.NODE_ENV === 'development') {
        app.use(cors());
    }

    // Register api
    app.use('/', api());

    wrapHTTPServer(server);
    server.on('request', app);
    server.listen(8080);
})();
