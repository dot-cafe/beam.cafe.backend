import {Client, ClientSettings} from '../store/Client';
import {log, LogLevel}          from '../logging';

export type WSRequest = {
    data: unknown;
    type: string;
    id: string;
}

const respondTo = (client: Client, id: string, ok: boolean, data: unknown = null): void =>
    client.sendMessage('response', {id, ok, data});

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
