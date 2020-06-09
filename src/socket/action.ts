import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {clients}       from '../store/clients';
import {streams}       from '../store/streams';
import {transmissions} from '../store/transmissions';
import {typeOf}        from '../utils/type-of';
import {handleRequest} from './request';

/**
 * Handles incoming messages.
 * Returns the client itself or the new client in case a session
 * got restored.
 */
export function handleAction(
    client: Client,
    data: unknown,
    ws: WebSocket
): Client {
    if (typeOf(data) !== 'object') {
        return client;
    }

    const {type, payload} = data as any;
    if (typeof type !== 'string') {
        log('invalid-payload', {
            location: 'ws'
        }, LogLevel.ERROR);
        return client;
    }

    switch (type) {
        case 'request': {
            handleRequest(client, payload);
            break;
        }
        case 'restore-session': {
            const oldClient = clients.restoreSession(payload, ws);

            if (oldClient) {

                // Remove current client and use new one
                clients.delete(client);
                return oldClient;
            }

            // Create a fresh sessions, this will clear all states client-side
            client.createSession();
            break;
        }
        case 'create-session': {
            client.createSession();
            break;
        }
        case 'register-files': {
            client.registerFiles(payload);
            break;
        }
        case 'cancel-requests': {
            if (Array.isArray(payload)) {
                for (const key of payload) {
                    if (typeof key === 'string') {
                        transmissions.cancelUpload(key);
                    }
                }
            }
            break;
        }
        case 'cancel-streams': {
            if (Array.isArray(payload)) {
                for (const key of payload) {
                    if (typeof key === 'string') {
                        streams.removeStreamKey(key);
                    }
                }
            }
            break;
        }
        case 'remove-files': {
            if (Array.isArray(payload)) {
                for (const key of payload) {
                    if (typeof key === 'string') {
                        client.removeFile(key);
                    }
                }
            }
            break;
        }
        case 'bulk': {

            // Validate payload
            if (!Array.isArray(payload)) {
                break;
            }

            for (const item of payload) {
                handleAction(client, item, ws);
            }

            break;
        }
        default: {
            log('invalid-payload', {
                location: 'ws-action',
                action: type
            }, LogLevel.ERROR);
        }
    }

    return client;
}
