import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {typeOf}        from '../utils/type-of';

const respondTo = (client: Client, id: string, ok: boolean, data: unknown = null): void =>
    client.sendMessage('response', {id, ok, data});

export function handleRequest(
    client: Client,
    request: unknown
): void {
    if (
        typeOf(request) !== 'object' ||
        typeof (request as any).id !== 'string' ||
        typeof (request as any).type !== 'string'
    ) {
        log('invalid-payload', {
            location: 'ws'
        }, LogLevel.ERROR);
        return;
    }

    const {id, data, type} = request as any;
    switch (type) {
        case 'settings': {
            respondTo(client, id, client.applySettings(data));
            break;
        }
        case 'reset-keys': {
            client.refreshKeys();
            respondTo(client, id, true);
            break;
        }
        default: {
            respondTo(client, id, false);

            log('invalid-payload', {
                location: 'ws-request',
                action: type
            }, LogLevel.ERROR);

            break;
        }
    }
}
