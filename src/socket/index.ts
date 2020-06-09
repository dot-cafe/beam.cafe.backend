import * as http      from 'http';
import {Server}       from 'ws';
import {acceptClient} from './client';

export const wrapHTTPServer = (httpServer: http.Server): void => {
    new Server({
        server: httpServer
    }).on('connection', acceptClient);
};
