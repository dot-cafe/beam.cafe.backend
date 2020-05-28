import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {HostedFile}    from '../types';
import {Client}        from './Client';
import {streams}       from './streams';
import {transmissions} from './transmissions';

export const clients = new class extends Set<Client> {

    public remove(client: Client): boolean {

        // Cancel all downloads
        const pendingDownloads = transmissions.byClient(client);
        for (const download of pendingDownloads) {
            download.cancel();
        }

        // Cancel all streams
        const activeStreams = streams.byClient(client);
        for (const stream of activeStreams) {
            stream.cancel();
        }

        log('destroy-session', {
            userId: client.id
        }, LogLevel.DEBUG);

        return this.delete(client);
    }

    public resolveFile(id: string | unknown): [Client, HostedFile] | null {
        if (typeof id !== 'string') {
            return null;
        }

        for (const client of this) {
            for (const file of client.files) {
                if (file.id === id) {
                    return [client, file];
                }
            }
        }

        return null;
    }

    public restoreSession(key: unknown, newSocket: WebSocket): Client | null {
        if (typeof key !== 'string') {
            return null;
        }

        // Find client with the corresponding session-key
        for (const client of this) {
            if (
                client.sessionKey !== null &&
                client.sessionKey === key
            ) {
                if (client.restoreSession(newSocket)) {
                    return client;
                }

                break;
            }
        }

        return null;
    }
};
