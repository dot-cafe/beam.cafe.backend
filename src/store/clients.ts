import * as WebSocket  from 'ws';
import {config}        from '../config';
import {log, LogLevel} from '../logging';
import {HostedFile}    from '../types';
import {Collection}    from '../utils/db/Collection';
import {Client}        from './Client';
import {streams}       from './streams';
import {transmissions} from './transmissions';

type TransferLimitEntry = {
    amount: number;
    timestamp: number;
}

export const clients = new class extends Collection<Client> {
    private readonly transferLimitMap: Map<string, TransferLimitEntry> = new Map();

    public updateIPLimit(client: Client, amount: number): boolean {
        let item = this.transferLimitMap.get(client.ip);

        if (!item) {
            item = {
                amount,
                timestamp: Date.now()
            } as TransferLimitEntry;

            this.transferLimitMap.set(client.ip, item);
        } else {
            item.amount += amount;
        }

        return this.checkIPLimit(client);
    }

    public checkIPLimit(client: Client): boolean {
        const item = this.transferLimitMap.get(client.ip);

        if (!item) {
            return false;
        }

        // Clear restriction
        const timeDiff = Date.now() - item.timestamp;
        if (timeDiff > config.security.transferLimitResetInterval) {
            this.transferLimitMap.delete(client.ip);
            return true;
        }

        return item.amount > config.security.transferLimit;
    }

    public remainingTimeForIPLimit(client: Client): number {
        const item = this.transferLimitMap.get(client.ip);

        if (!item) {
            return -1;
        }

        const timeDiff = Date.now() - item.timestamp;
        if (timeDiff > config.security.transferLimitResetInterval) {
            this.transferLimitMap.delete(client.ip);
            return -1;
        }

        return config.security.transferLimitResetInterval - timeDiff;
    }

    public delete(client: Client): boolean {

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

        return super.delete(client);
    }

    public resolveFile(id: string): [Client, HostedFile] | null {
        for (const client of this) {
            for (const file of client.files) {
                if (file.id === id) {
                    return [client, file];
                }
            }
        }

        return null;
    }

    public async restoreSession(key: string, newSocket: WebSocket): Promise<Client | null> {

        // Find client with the corresponding session-key
        for (const client of this) {
            if (
                client.sessionKey !== null &&
                client.sessionKey === key
            ) {
                if (await client.restoreSession(newSocket)) {
                    return client;
                }

                break;
            }
        }

        return null;
    }
};
