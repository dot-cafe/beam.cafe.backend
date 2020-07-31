import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {clients}       from '../store/clients';
import {streams}       from '../store/streams';
import {transmissions} from '../store/transmissions';
import {handleRequest} from './request';
import {validation}    from './validation';

/**
 * Handles incoming messages.
 * Returns the client itself or the new client in case a session
 * got restored.
 */
export async function handleAction(
    client: Client,
    data: unknown,
    ws: WebSocket
): Promise<Client> {

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const {error, value} = validation.ClientAction.validate<any>(data);

    if (error) {
        log('validation-error', {error}, LogLevel.WARNING);
        return client;
    }

    const {type, payload} = value;
    switch (type) {
        case 'request': {
            handleRequest(client, payload);
            break;
        }
        case 'restore-session': {
            const {error, value} = validation.String.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                return clients.restoreSession(value, ws).then(ok => {

                    if (ok) {

                        // Clear socket-timeout
                        clearTimeout(client.socketTimeout);

                        // Remove current client and use new one
                        clients.delete(client);
                        return ok;
                    }

                    // Create a fresh sessions, this will clear all states client-side
                    client.createSession();
                    return client;
                });
            }
            break;
        }
        case 'create-session': {
            await client.createSession();
            break;
        }
        case 'register-files': {
            const {error, value} = validation.FileListSchema.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                await client.registerFiles(value);
            }
            break;
        }
        case 'refresh-files': {
            const {error, value} = validation.StringArray.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                await client.refreshFiles(value);
            }
            break;
        }
        case 'refresh-all-files': {
            await client.refreshAllFiles();
            break;
        }
        case 'cancel-requests': {
            const {error, value} = validation.StringArray.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                for (const key of value) {
                    transmissions.cancelUpload(key);
                }
            }
            break;
        }
        case 'cancel-streams': {
            const {error, value} = validation.StringArray.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                for (const key of value) {
                    streams.removeStreamKey(key);
                }
            }
            break;
        }
        case 'remove-files': {
            const {error, value} = validation.StringArray.validate(payload);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
            } else {
                for (const key of value) {
                    client.removeFile(key);
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
                await handleAction(client, item, ws);
            }

            break;
        }
        default: {
            log('invalid-payload', {
                location: 'ws-action',
                description: `Invalid type "${type}"`
            }, LogLevel.ERROR);
        }
    }

    return client;
}
