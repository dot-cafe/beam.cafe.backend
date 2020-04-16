import * as WebSocket from 'ws';
import {Client}       from '../classes/Client';
import {Download}     from '../classes/Download';

/* eslint-disable no-console */
export const acceptClient = (ws: WebSocket): void => {
    const client = new Client(ws);

    ws.on('message', (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            const {type, payload} = JSON.parse(message);

            switch (type) {
                case 'download-keys': {
                    client.acceptFiles(payload);
                    break;
                }
                case 'cancel-request': {
                    Download.cancelUpload(payload);
                    break;
                }
                case 'remove-file': {
                    client.removeFile(payload);
                    break;
                }
                default: {
                    console.warn(`[WS] Unknown action: ${type}`);
                }
            }
        } catch (e) {
        }
    });

    ws.on('close', () => client.remove());
};
