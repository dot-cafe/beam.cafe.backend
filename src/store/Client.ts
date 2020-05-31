import Joi                from '@hapi/joi';
import {Request}          from 'express';
import * as WebSocket     from 'ws';
import {config}           from '../config';
import {log, LogLevel}    from '../logging';
import {HostedFile}       from '../types';
import {decryptUserAgent} from '../utils/decrypt-user-agent';
import {typeOf}           from '../utils/type-of';
import {uid}              from '../utils/uid';
import {clients}          from './clients';
import {transmissions}    from './transmissions';

type Settings = {
    reusableDownloadKeys: boolean;
    strictSession: boolean;
    allowStreaming: boolean;
}

export const ClientSettings = Joi.object({
    reusableDownloadKeys: Joi.boolean().optional(),
    strictSession: Joi.boolean().optional(),
    allowStreaming: Joi.boolean().optional()
});

export class Client {
    public static readonly DEFAULT_SETTINGS: Settings = {
        reusableDownloadKeys: true,
        strictSession: false,
        allowStreaming: true
    };

    public readonly id: string;
    public readonly files: Array<HostedFile>;
    public readonly settings: Settings;
    public readonly userAgent: string;
    public socket: WebSocket;
    public sessionKey: string | null;

    // Timeout for this client to get removed after a disconnection
    private connectionTimeout: NodeJS.Timeout | null;
    private timeoutTimestamp = 0;

    constructor(socket: WebSocket, req: Request) {
        this.id = uid(config.server.internalIdSize);
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

    public createSession(): boolean {
        if (this.sessionKey === null) {
            this.sessionKey = uid(config.security.clientWebSocketSessionKeySize);
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

    public restoreSession(newSocket: WebSocket): boolean {

        // Check if the session of the client got "invalidated"
        if (this.connectionTimeout !== null) {
            clearTimeout(this.connectionTimeout);

            // Update socket
            this.socket = newSocket;

            // Reset timeout and create new session-key
            this.connectionTimeout = null;
            this.sessionKey = uid(config.security.clientWebSocketSessionKeySize);

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

    public acceptFiles(incomingFiles: unknown): void {
        const files: Array<HostedFile> = [];

        if (!Array.isArray(incomingFiles)) {
            return;
        }

        for (const file of incomingFiles) {
            if (
                typeOf(file) === 'object' &&
                typeof file.name === 'string' &&
                typeof file.size === 'number'
            ) {

                files.push({
                    id: uid(),
                    name: file.name,
                    size: file.size
                });
            }
        }

        this.sendMessage('file-registrations', files.map(value => ({
            id: value.id,
            name: value.name
        })));

        this.files.push(...files);
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

    public requestFile(
        fileId: string,
        downloadId: string
    ): void {
        const file = this.files.find(value => value.id === fileId);

        if (file) {
            this.sendMessage('file-request', {
                downloadId, fileId
            });

            // Refresh key of this file
            if (!this.settings.reusableDownloadKeys) {
                file.id = uid();

                this.sendMessage('file-registrations', [{
                    id: file.id,
                    name: file.name
                }]);
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

    public refreshKeys(): void {

        // Cancel all downloads
        for (const download of transmissions.byClient(this)) {
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

    public applySettings(settings: unknown): boolean {
        if (!ClientSettings.validate(settings)) {
            log('invalid-payload', {
                location: 'settings'
            }, LogLevel.ERROR);
            return false;
        }

        for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
            this.applySetting(key as any, value);
        }

        return true;
    }

    public sendMessage(type: string, payload: unknown = null): void {
        this.socket.send(JSON.stringify({type, payload}));
    }
}
