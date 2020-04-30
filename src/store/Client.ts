import Joi             from '@hapi/joi';
import * as WebSocket  from 'ws';
import {log, LogLevel} from '../logging';
import {HostedFile}    from '../types';
import {uid}           from '../utils/uid';
import {clients}       from './clients';
import {downloads}     from './downloads';

type IncomingFiles = {
    name: string | unknown;
    size: number | unknown;
}

type Settings = {
    strictSession: boolean;
}

export const ClientSettings = Joi.object({
    strictSession: Joi.boolean().optional()
});

export class Client {
    public static readonly CONNECTION_TIMEOUT = 1000 * 60 * 15; // 15 Minutes
    public static readonly SESSION_KEY_SIZE = 64;
    public static readonly DEFAULT_SETTINGS: Settings = {
        strictSession: false
    };

    public readonly files: Array<HostedFile>;
    public readonly settings: Settings;
    public socket: WebSocket;
    public sessionKey: string | null;

    // Timeout for this client to get removed after a disconnection
    private connectionTimeout: NodeJS.Timeout | null;

    constructor(socket: WebSocket) {
        this.files = [];
        this.socket = socket;
        this.sessionKey = null;
        this.connectionTimeout = null;
        this.settings = {...Client.DEFAULT_SETTINGS};

        clients.add(this);
        log(`New client; Connected: ${clients.amount}`);
    }

    public get disconnected(): boolean {
        return this.connectionTimeout !== null;
    }

    public markDisconnected(): void {
        if (this.settings.strictSession) {
            clients.remove(this);
        } else {
            this.connectionTimeout = setTimeout(
                () => clients.remove(this),
                Client.CONNECTION_TIMEOUT
            );
        }
    }

    public createSession(): boolean {
        if (this.sessionKey === null) {
            this.sessionKey = uid(Client.SESSION_KEY_SIZE);
            this.sendMessage('new-session', this.sessionKey);

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

            this.sendMessage('restore-session', {
                key: this.sessionKey,
                files: this.files.map(value => ({
                    name: value.name,
                    id: value.id
                }))
            });

            return true;
        }

        log('Cannot reconnect because the client is already connected.', LogLevel.ERROR);
        return false;
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


        this.sendMessage('file-registrations', files.map(value => ({
            id: value.id,
            name: value.name
        })));

        this.files.push(...files);
    }

    public requestFile(
        fileId: string,
        downloadId: string
    ): void {
        if (this.files.some(value => value.id === fileId)) {
            this.sendMessage('file-request', {
                downloadId,
                fileId
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
            const active = downloads.byFileId(file.id);
            for (const download of active) {
                download.cancel();
            }

            log(`File removed; ${active.length} downloads cancelled`);
        } else {
            log('Cannot remove file because it does not exist', LogLevel.WARNING);
        }
    }

    public refreshKeys(): void {

        // Cancel all downloads
        for (const download of downloads.byClient(this)) {
            download.cancel();
        }

        // Generate new keys
        const files: Array<unknown> = [];
        for (const file of this.files) {
            const newId = uid();
            file.id = newId;

            files.push({
                id: newId,
                name: file.name
            });
        }

        this.sendMessage('file-registrations', files);
    }

    public applySetting<K extends keyof Settings>(key: K, value: Settings[K]): boolean {
        if (key in Client.DEFAULT_SETTINGS) {
            this.settings[key] = value;
            return true;
        }

        return false;
    }

    public sendMessage(type: string, payload: unknown = null): void {
        this.socket.send(JSON.stringify({type, payload}));
    }
}
