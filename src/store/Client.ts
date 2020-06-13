import {Request}           from 'express';
import * as WebSocket      from 'ws';
import {config}            from '../config';
import {log, LogLevel}     from '../logging';
import {HostedFile}        from '../types';
import {CollectionItem}    from '../utils/db/CollectionItem';
import {decryptUserAgent}  from '../utils/decrypt-user-agent';
import {serializeFilename} from '../utils/serializeFileName';
import {secureUid}         from '../utils/uid';
import {clients}           from './clients';
import {transmissions}     from './transmissions';

type Settings = {
    reusableDownloadKeys: boolean;
    strictSession: boolean;
    allowStreaming: boolean;
}

export class Client extends CollectionItem {
    public static readonly DEFAULT_SETTINGS: Settings = {
        reusableDownloadKeys: true,
        strictSession: false,
        allowStreaming: true
    };

    public readonly files: Array<HostedFile>;
    public readonly settings: Settings;
    public readonly userAgent: string;
    public socket: WebSocket;
    public sessionKey: string | null;

    // Timeout for this client to get removed after a disconnection
    private connectionTimeout: NodeJS.Timeout | null;
    private timeoutTimestamp = 0;

    constructor(socket: WebSocket, req: Request) {
        super();
        this.files = [];
        this.socket = socket;
        this.sessionKey = null;
        this.connectionTimeout = null;
        this.timeoutTimestamp = 0;
        this.settings = {...Client.DEFAULT_SETTINGS};

        const uaHeader = req.headers['user-agent'];
        this.userAgent = config.logs.logUserAgent ?
            uaHeader ? decryptUserAgent(uaHeader) : 'unknown' :
            'hidden';

        clients.add(this);
    }

    public get disconnected(): boolean {
        return this.connectionTimeout !== null;
    }

    public markDisconnected(): void {
        if (this.settings.strictSession) {
            clients.delete(this);
        } else {
            this.connectionTimeout = setTimeout(
                () => clients.delete(this),
                config.security.clientWebSocketConnectionTimeout
            );
        }
    }

    public async createSession(): Promise<boolean> {
        if (this.sessionKey === null) {
            this.sessionKey = await secureUid(config.security.clientWebSocketSessionKeySize);
            this.sendMessage('new-session', this.sessionKey);

            log('create-session', {
                userId: this.id,
                userAgent: this.userAgent
            }, LogLevel.DEBUG);

            return true;
        }

        log('create-session-failed', {
            userId: this.id,
            reason: 'User does already have an active session.'
        }, LogLevel.WARNING);
        return false;
    }

    public async restoreSession(newSocket: WebSocket): Promise<boolean> {

        // Check if the session of the client got "invalidated"
        if (this.connectionTimeout !== null) {
            clearTimeout(this.connectionTimeout);

            // Update socket
            this.socket = newSocket;

            // Reset timeout and create new session-key
            this.connectionTimeout = null;
            this.sessionKey = await secureUid(config.security.clientWebSocketSessionKeySize);

            this.sendMessage('restore-session', {
                key: this.sessionKey,
                settings: this.settings,
                files: this.files.map(value => ({
                    name: value.name,
                    id: value.id
                }))
            });

            log('restore-session', {
                userId: this.id
            }, LogLevel.DEBUG);

            return true;
        }

        log('restore-session-failed', {
            userId: this.id,
            reason: 'Session is already active.'
        }, LogLevel.WARNING);
        return false;
    }

    public async registerFiles(
        incomingFiles: Array<{name: string, size: number}>
    ): Promise<void> {
        const files: Array<HostedFile> = [];
        for (const file of incomingFiles) {
            const {name, size} = file;

            if (this.files.find(value => value.name === name)) {
                continue;
            }

            files.push({
                id: await secureUid(config.security.fileKeySize),
                serializedName: serializeFilename(name),
                name, size
            });
        }

        this.files.push(...files);
        this.sendMessage('register-files', files.map(v => ({
            id: v.id,
            name: v.name,
            serializedName: v.serializedName
        })));
    }

    public requestStream(
        fileId: string,
        streamId: string,
        streamKey: string,
        range: [number, number] | null
    ): void {
        const file = this.files.find(value => value.id === fileId);

        if (file) {
            this.sendMessage('stream-request', {
                streamKey, streamId, fileId, range
            });

            log('request-stream', {
                userId: this.id,
                streamKey,
                streamId,
                fileId
            }, LogLevel.DEBUG);
        } else {
            log('request-stream-failed', {
                reason: 'Requested file does not exist any longer',
                userId: this.id,
                streamKey,
                streamId,
                fileId
            }, LogLevel.WARNING);
        }
    }

    public async requestFile(
        fileId: string,
        downloadId: string
    ): Promise<void> {
        const file = this.files.find(value => value.id === fileId);

        if (file) {
            this.sendMessage('file-request', {
                downloadId, fileId
            });

            // Refresh key of this file
            if (!this.settings.reusableDownloadKeys) {
                const newId = await secureUid(config.security.fileKeySize);
                this.sendMessage('refresh-files', [{
                    id: file.id,
                    newId
                }]);

                file.id = newId;
            }

            log('request-upload', {
                userId: this.id,
                downloadId,
                fileId
            }, LogLevel.DEBUG);
        } else {
            log('request-upload-failed', {
                reason: 'Requested file does not exist any longer',
                userId: this.id,
                downloadId,
                fileId
            }, LogLevel.WARNING);
        }
    }

    public removeFile(id: string): void {
        const file = this.files.find(value => value.id === id);

        if (file) {

            // Cancel downloads associated with it
            const active = transmissions.byFileId(file.id);
            for (const download of active) {
                download.cancel();
            }
        } else {
            log('remove-file-failed', {
                reason: 'Cannot remove file because it does not exist',
                userId: this.id
            }, LogLevel.WARNING);
        }
    }

    public async refreshFiles(ids: Array<string>): Promise<void> {

        // Generate new keys
        const files: Array<unknown> = [];
        for (const id of ids) {
            const file = this.files.find(v => v.id === id);

            if (file) {

                // Cancel all downloads
                for (const download of transmissions.byFileId(file.id)) {
                    download.cancel();
                }

                // Refresh key
                const newId = await secureUid(config.security.fileKeySize);
                files.push({
                    id: file.id,
                    newId
                });

                file.id = newId;
            }
        }

        this.sendMessage('refresh-files', files);
    }

    public async refreshAllFiles(): Promise<void> {

        // Cancel all downloads
        for (const download of transmissions.byClient(this)) {
            download.cancel();
        }

        const files: Array<unknown> = [];
        for (const file of this.files) {

            // Refresh key
            const newId = await secureUid(config.security.fileKeySize);
            files.push({
                id: file.id,
                newId
            });

            file.id = newId;
        }

        this.sendMessage('refresh-files', files);
    }

    public applySettings(settings: Partial<Settings>): void {
        Object.assign(this.settings, settings);
    }

    public sendMessage(type: string, payload: unknown = null): void {
        this.socket.send(JSON.stringify({type, payload}));
    }
}
