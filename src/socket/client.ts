import * as WebSocket from 'ws';
import {uid}          from '../utils/uid';
import {clients}      from './index';

export type HostedFile = {
    name: string;
    size: number;
    keys: Array<string>;
};

export type Client = {
    socket: WebSocket;
    files: Array<HostedFile>;
};

/* eslint-disable no-console */
export const acceptClient = (ws: WebSocket): void => {
    const client: Client = {
        socket: ws,
        files: []
    };

    clients.push(client);
    ws.on('message', (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            const {type, payload} = JSON.parse(message);
            const ids = [];

            switch (type) {
                case 'req-download-keys': {

                    // Register files
                    for (const file of payload) {
                        const fileId = uid();

                        ids.push({
                            name: file.name,
                            key: fileId
                        });

                        client.files.push({
                            keys: [fileId],
                            name: file.name,
                            size: file.size
                        });
                    }

                    // Reply with unique ids
                    ws.send(JSON.stringify({
                        type: 'res-download-keys',
                        payload: ids
                    }));
                    break;
                }
                default: {
                    console.warn(`[WS] Unknown action: ${type}`);
                }
            }

        } catch (e) {
        }
    });

    ws.on('close', () => {
        const index = clients.indexOf(client);
        clients.splice(index, 1);
    });
};
