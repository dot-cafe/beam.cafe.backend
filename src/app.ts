import cors             from 'cors';
import express          from 'express';
import http             from 'http';
import * as path        from 'path';
import {api}            from './api';
import {config}         from './config';
import {TEMPLATES}      from './constants';
import {log, LogLevel}  from './logging';
import {wrapHTTPServer} from './socket';
import {renderEJS}      from './utils/renderEJS';

(async (): Promise<void> => {
    const dev = process.env.NODE_ENV === 'development';
    const server = http.createServer();
    const app = express();

    // Disable powered-by-message
    app.disable('x-powered-by');
    app.set('trust proxy', true);

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
    const templateAssets = path.resolve(__dirname, dev ? '../dist/assets' : '../assets');
    app.use('/b/assets', express.static(templateAssets));

    // Register api
    app.use(api());

    // 404 Fallback
    app.use((_, res) => renderEJS({
        template: TEMPLATES.ERROR_404,
        response: res
    }));

    // Attach websocket server
    wrapHTTPServer(server);

    // Bind server to express and start listening
    server.on('request', app);
    server.listen(config.server.port);

    log('booting', {
        message: 'Server successfully started launched.'
    }, LogLevel.INFO);
})();
