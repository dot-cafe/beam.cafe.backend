import * as WebSocket from 'ws';
import {HostedFile}   from '../types';
import {removeItem}   from '../utils/array';
import {uid}          from '../utils/uid';
import {Download}     from './Download';

type Message = {
    type: string;
    payload: object;
}

type IncomingFiles = {
    name: string | unknown;
    size: number | unknown;
}

export class Client {
    public static readonly clients: Array<Client> = [];
    public readonly socket: WebSocket;
    public readonly files: Array<HostedFile>;

    constructor(socket: WebSocket) {
        this.socket = socket;
        this.files = [];
        Client.clients.push(this);
        console.log(`[CLIENT] New client; Connected: ${Client.clients.length}`);
    }

    public static remove(download: Client): void {
        removeItem(Client.clients, download);
    }

    public static resolveFile(id: string): [Client, HostedFile] | null {
        for (const client of Client.clients) {
            for (const file of client.files) {
                if (file.id === id) {
                    return [client, file];
                }
            }
        }

        return null;
    }

    public remove(): void {

        // Cancel all downloads
        const pendingDownloads = Download.fromClient(this);
        for (const download of pendingDownloads) {
            download.cancel();
        }

        // Remove client
        Client.remove(this);
        console.log(`[CLIENT] Client lost: Downloads cleaned up: ${pendingDownloads.length}; Connected: ${Client.clients.length}`);
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
                console.warn('[CLIENT] Invalid item as incoming-file: ', file);
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
            console.warn('[CLIENT] Requested file does not exist any longer.');
        }
    }

    public removeFile(id: string | unknown): void {
        if (typeof id !== 'string') {
            console.warn('[CLIENT] Cannot remove file: Invalid payload.');
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

            console.log(`[CLIENT] File removed, ${removed} download(s) cancelled.`);
        } else {
            console.warn('[CLIENT] Cannot remove file: File does not exist.');
        }
    }

    private sendJSON(value: Message): void {
        this.socket.send(JSON.stringify(value));
    }
}
