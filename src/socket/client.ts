import * as WebSocket                     from 'ws';
import {clients, downloads}               from '../state';
import {Client, Download, DownloadStatus} from '../types';
import {removeItem}                       from '../utils/array';
import {uid}                              from '../utils/uid';

function cancelDownload(download: Download): void {
    download.dRes.status(410);
    download.dRes.send();
    download.uRes?.status(410);
    download.uRes?.send();
    removeItem(downloads, download);
}

/* eslint-disable no-console */
let clientCounter = 0;
export const acceptClient = (ws: WebSocket): void => {
    clientCounter++;

    console.log(`[WS] New client; Connected: ${clientCounter}`);
    const client: Client = {
        socket: ws,
        files: []
    };

    clients.push(client);
    ws.on('message', (message: string) => {

        // Answer ping request
        if (message === '__PING__') {
            return ws.send('__PONG__');
        }

        // Try to parse message
        try {
            const {type, payload} = JSON.parse(message);

            switch (type) {
                case 'download-keys': {
                    const ids = [];

                    // Register files
                    for (const file of payload) {
                        const key = uid();
                        const id = uid();

                        ids.push({
                            name: file.name,
                            key,
                            id
                        });

                        client.files.push({
                            id,
                            key,
                            name: file.name,
                            size: file.size
                        });
                    }

                    // Reply with unique ids
                    ws.send(JSON.stringify({
                        type: 'download-keys',
                        payload: ids
                    }));
                    break;
                }
                case 'cancel-request': {
                    const download = downloads.find(v => v.id === payload);

                    if (download &&
                        download.status === DownloadStatus.Pending ||
                        download.status === DownloadStatus.Active) {
                        download.status = DownloadStatus.Cancelled;
                        download.dRes.status(424); // Failed Dependency
                        download.dRes.send();
                    }

                    break;
                }
                case 'remove-file': {
                    const file = client.files.find(value => value.id === payload);

                    if (file) {

                        // Cancel downloads associated with it
                        for (const download of downloads) {
                            if (download.file.id === payload) {
                                cancelDownload(download);
                            }
                        }
                    }

                    break;
                }
                default: {
                    console.warn(`[WS] Unknown action: ${type}`);
                }
            }
        } catch (e) {
        }
    });

    ws.on('close', () => {
        clientCounter--;

        // Cancel all downloads
        const pendingDownloads = downloads.filter(value => value.fileProvider === client);
        for (const download of pendingDownloads) {
            cancelDownload(download);
        }

        // Remove client
        removeItem(clients, client);
        console.log(`[WS] Client lost: Downloads cleaned up: ${pendingDownloads.length}; Connected: ${clientCounter}`);
    });
};
