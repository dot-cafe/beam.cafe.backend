import * as WebSocket from 'ws';
import {HostedFile}   from '../types';
import {Client}       from './Client';

export const clients = new class {
    private readonly list: Set<Client> = new Set();

    public get amount(): number {
        return this.list.size;
    }

    public add(client: Client): void {
        this.list.add(client);
    }

    public remove(client: Client): void {
        this.list.delete(client);
    }

    public resolveFile(id: string | unknown): [Client, HostedFile] | null {
        if (typeof id !== 'string') {
            return null;
        }

        for (const client of this.list) {
            for (const file of client.files) {
                if (file.id === id) {
                    return [client, file];
                }
            }
        }

        return null;
    }

    public restoreSession(key: string | unknown, newSocket: WebSocket): Client | null {
        if (typeof key !== 'string') {
            return null;
        }

        // Find client with the corresponding session-key
        for (const client of this.list) {
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
