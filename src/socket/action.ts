import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {clients}       from '../store/clients';
import {downloads}     from '../store/downloads';
import {handleRequest} from './request';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function handleAction(
    client: Client,
    data: any,
    ws: WebSocket
): void {
    const {type, payload} = data;

    if (typeof type !== 'string') {
        log('Invalid action type', LogLevel.ERROR);
        return;
    }

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
            const oldClient = clients.restoreSession(payload, ws);

            if (oldClient) {

                // Remove current client and use new one
                clients.remove(client);
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
            downloads.cancelUpload(payload);
            break;
        }
        case 'remove-file': {
            client.removeFile(payload);
            break;
        }
        case 'bulk': {
            if (!Array.isArray(payload)) {
                log('Bulk-payload must be an array', LogLevel.ERROR);
                break;
            }

            for (const item of payload) {
                handleAction(client, item, ws);
            }

            break;
        }
        default: {
            log(`Unknown ws-request: ${type}`, LogLevel.WARNING);
        }
    }
}
