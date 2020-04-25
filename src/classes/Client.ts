import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {HostedFile}    from '../types';
import {removeItem}    from '../utils/array';
import {uid}           from '../utils/uid';
import {Download}      from './Download';

type Message = {
    type: string;
    payload: unknown;
}

type IncomingFiles = {
    name: string | unknown;
    size: number | unknown;
}

export class Client {
    public static readonly CONNECTION_TIMEOUT = 1000 * 60 * 15; // 15 Minutes
    public static readonly SESSION_KEY_SIZE = 64;
    public static readonly clients: Array<Client> = [];
    public readonly files: Array<HostedFile>;
    public socket: WebSocket;
    public sessionKey: string | null;

    // Timeout for this client to get removed after a disconnection
    public connectionTimeout: NodeJS.Timeout | null;

    constructor(socket: WebSocket) {
        this.files = [];
        this.socket = socket;
        this.sessionKey = null;
        this.connectionTimeout = null;

        Client.clients.push(this);
        log(`New client; Connected: ${Client.clients.length}`);
    }

    public static remove(download: Client): void {
        removeItem(Client.clients, download);
    }

    public static resolveFile(id: string | unknown): [Client, HostedFile] | null {
        if (typeof id !== 'string') {
            return null;
        }

        for (const client of Client.clients) {
            for (const file of client.files) {
                if (file.id === id) {
                    return [client, file];
                }
            }
        }

        return null;
    }

    public static restoreSession(
        key: string | unknown,
        newSocket: WebSocket
    ): Client | null {
        if (typeof key !== 'string') {
            return null;
        }

        // Find client with the corresponding session-key
        for (const client of Client.clients) {
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

    public disconnected(): void {
        this.connectionTimeout = setTimeout(() => {
            this.remove();
        }, Client.CONNECTION_TIMEOUT);
    }

    public createSession(): boolean {
        if (this.sessionKey === null) {
            this.sessionKey = uid(Client.SESSION_KEY_SIZE);

            this.sendJSON({
                type: 'new-session',
                payload: this.sessionKey
            });

            return true;
        }

        log('User does already have an active session.', LogLevel.ERROR);
        return false;
    }

    public restoreSession(newSocket: WebSocket): boolean {

        // Check if the session of the client got "invalidated"
        if (this.connectionTimeout !== null) {
            clearTimeout(this.connectionTimeout);

            // Update socket
            this.socket = newSocket;

            // Reset timeout and create new session-key
            this.connectionTimeout = null;
            this.sessionKey = uid(Client.SESSION_KEY_SIZE);

            this.sendJSON({
                type: 'restore-session',
                payload: {
                    key: this.sessionKey,
                    files: this.files.map(value => ({
                        name: value.name,
                        id: value.id
                    }))
                }
            });

            return true;
        }

        log('Cannot reconnect because the client is already connected.', LogLevel.ERROR);
        return false;
    }

    public remove(): void {

        // Cancel all downloads
        const pendingDownloads = Download.fromClient(this);
        for (const download of pendingDownloads) {
            download.cancel();
        }

        // Remove client
        Client.remove(this);
        log(`Client disconnected; Remaining: ${Client.clients.length}; Downloads cancelled: ${pendingDownloads.length}`);
    }

    public acceptFiles(incomingFiles: Array<IncomingFiles>): void {
        const files: Array<HostedFile> = [];

        for (const file of incomingFiles) {
            if (typeof file.name === 'string' &&
                typeof file.size === 'number') {

                files.push({
                    id: uid(),
                    name: file.name,
                    size: file.size
                });
            } else {
                log('Invalid incoming-file', LogLevel.ERROR);
            }
        }

        this.sendJSON({
            type: 'file-registrations',
            payload: files.map(value => ({
                id: value.id,
                name: value.name
            }))
        });

        this.files.push(...files);
    }

    public requestFile(
        fileId: string,
        downloadId: string
    ): void {
        if (this.files.some(value => value.id === fileId)) {
            this.sendJSON({
                type: 'file-request',
                payload: {
                    downloadId,
                    fileId
                }
            });
        } else {
            log('Requested file does not exist any longer', LogLevel.INFO);
        }
    }

    public removeFile(id: string | unknown): void {
        if (typeof id !== 'string') {
            log(`Cannot remove file: invalid payload of type: ${typeof id}`, LogLevel.ERROR);
            return;
        }

        const file = this.files.find(value => value.id === id);
        if (file) {

            // Cancel downloads associated with it
            let removed = 0;
            for (const download of Download.downloads) {
                if (download.file.id === id) {
                    download.cancel();
                    removed++;
                }
            }

            log(`File removed; ${removed} downloads cancelled`);
        } else {
            log('Cannot remove file because it does not exist', LogLevel.WARNING);
        }
    }

    private sendJSON(value: Message): void {
        this.socket.send(JSON.stringify(value));
    }
}
