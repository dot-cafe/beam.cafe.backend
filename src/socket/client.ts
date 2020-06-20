import * as WebSocket  from 'ws';
import * as http       from 'http';
import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {handleAction}  from './action';

export const acceptClient = (ws: WebSocket, req: http.IncomingMessage): void => {
    let client = new Client(ws, req);

    ws.on('message', async (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            client = await handleAction(client, JSON.parse(message), ws);
        } catch (e) {
            log('invalid-payload', {
                location: 'ws-entry',
                description: 'Failed to parse JSON body',
                error: e
            }, LogLevel.ERROR);
        }
    });

    ws.on('close', () => {
        client.markDisconnected();
    });
};
