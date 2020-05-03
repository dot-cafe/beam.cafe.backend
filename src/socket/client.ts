import {Request}       from 'express';
import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {handleAction}  from './action';

/* eslint-disable no-console */
export const acceptClient = (ws: WebSocket, req: Request): void => {
    const client = new Client(ws, req);

    ws.on('message', (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            handleAction(client, JSON.parse(message), ws);
        } catch (e) {
            log(`Failed to parse websocket request: ${e.message}`, LogLevel.ERROR);
        }
    });

    ws.on('close', () => {
        client.markDisconnected();
    });
};
