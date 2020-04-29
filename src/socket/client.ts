import * as WebSocket  from 'ws';
import {Client}        from '../classes/Client';
import {Download}      from '../classes/Download';
import {log, LogLevel} from '../logging';
import {handleRequest} from './request';

/* eslint-disable no-console */
export const acceptClient = (ws: WebSocket): void => {
    let client = new Client(ws);

    ws.on('message', (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            const {type, payload} = JSON.parse(message);

            switch (type) {
                case 'request': {
                    if (
                        typeof payload.id !== 'string' ||
                        typeof payload.type !== 'string'
                    ) {
                        log('Invalid websocket request', LogLevel.ERROR);
                        break;
                    }

                    handleRequest(client, payload);
                    break;
                }
                case 'restore-session': {
                    const oldClient = Client.restoreSession(payload, ws);

                    if (oldClient) {

                        // Remove current client and use new one
                        client.remove();
                        client = oldClient;
                    } else {

                        // Create a fresh sessions, this will clear all states client-side
                        client.createSession();
                    }

                    break;
                }
                case 'create-session': {
                    client.createSession();
                    break;
                }
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
                    log(`Unknown ws-request: ${type}`, LogLevel.WARNING);
                }
            }
        } catch (e) {
            log(`Failed to parse websocket request: ${e.message}`, LogLevel.ERROR);
        }
    });

    ws.on('close', () => {
        client.disconnected();
    });
};
