import * as http              from 'http';
import {Server}               from 'ws';
import {acceptClient, Client} from './client';

export const clients: Array<Client> = [];

/* eslint-disable no-console */
export const wrapHTTPServer = (httpServer: http.Server): void => {
    new Server({
        server: httpServer
    }).on('connection', acceptClient);
};
