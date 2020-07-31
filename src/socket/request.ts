import {log, LogLevel} from '../logging';
import {Client}        from '../store/Client';
import {validation}    from './validation';

const respondTo = (client: Client, id: string, ok: boolean, data: unknown = null): void =>
    client.sendMessage('response', {id, ok, data});

export function handleRequest(
    client: Client,
    request: unknown
): void {

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const {error, value} = validation.ClientRequest.validate<any>(request);

    if (error) {
        log('validation-error', {error}, LogLevel.WARNING);
        return;
    }

    const {id, data, type} = value;
    switch (type) {
        case 'settings': {
            const {error, value} = validation.ClientSettings.validate(data);

            if (error) {
                log('validation-error', {error}, LogLevel.WARNING);
                respondTo(client, id, false);
            } else {
                client.applySettings(value);
                respondTo(client, id, true);
            }

            break;
        }
        default: {
            respondTo(client, id, false);

            log('invalid-payload', {
                location: 'ws-request',
                description: `Invalid type "${type}"`
            }, LogLevel.ERROR);

            break;
        }
    }
}
