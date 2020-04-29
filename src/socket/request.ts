import {Client}        from '../classes/Client';
import {log, LogLevel} from '../logging';

export type WSRequest = {
    data: unknown;
    type: string;
    id: string;
}

function respondTo(client: Client, id: string, ok: boolean, data: unknown = null) {

    // TODO: Add sendMessage function with (type, payload) args
    client.sendJSON({
        type: 'response',
        payload: {id, ok, data}
    });
}

export function handleRequest(
    client: Client,
    request: WSRequest
) {
    const {id, data, type} = request;

    switch (type) {
        case 'strict-session': {
            client.settings.strictSession = !!data;
            respondTo(client, id, true);
            break;
        }
        default: {
            log(`Unknown websockt request: ${type}`, LogLevel.ERROR);
            break;
        }
    }
}
