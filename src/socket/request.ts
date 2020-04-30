import {Client, ClientSettings} from '../classes/Client';
import {log, LogLevel}          from '../logging';

export type WSRequest = {
    data: unknown;
    type: string;
    id: string;
}

function respondTo(client: Client, id: string, ok: boolean, data: unknown = null): void {

    // TODO: Add sendMessage function with (type, payload) args
    client.sendJSON({
        type: 'response',
        payload: {id, ok, data}
    });
}

export function handleRequest(
    client: Client,
    request: WSRequest
): void {
    const {id, data, type} = request;

    switch (type) {
        case 'settings': {
            if (!ClientSettings.validate(data)) {
                log('Cannot sync settings: data is invalid', LogLevel.ERROR);
                break;
            }

            /* eslint-disable @typescript-eslint/no-explicit-any */
            for (const [key, value] of Object.entries(data as object)) {
                client.applySetting(key as any, value);
            }

            respondTo(client, id, true);
            break;
        }
        case 'reset-keys': {
            client.refreshKeys();
            respondTo(client, id, true);
            break;
        }
        default: {
            respondTo(client, id, false);
            log(`Unknown websockt request: ${type}`, LogLevel.ERROR);
            break;
        }
    }
}
