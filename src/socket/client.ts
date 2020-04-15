import * as WebSocket       from 'ws';
import {clients, downloads} from '../state';
import {Client}             from '../types';
import {removeItem}         from '../utils/array';
import {uid}                from '../utils/uid';

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
            const ids = [];

            switch (type) {
                case 'download-keys': {

                    // Register files
                    for (const file of payload) {
                        const fileId = uid();

                        ids.push({
                            name: file.name,
                            key: fileId
                        });

                        client.files.push({
                            key: fileId,
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
            download.dRes.status(410);
            download.dRes.send();
            download.uRes?.status(410);
            download.uRes?.send();
            removeItem(downloads, download);
        }

        // Remove client
        removeItem(clients, client);
        console.log(`[WS] Client lost: Downloads cleaned up: ${pendingDownloads.length}; Connected: ${clientCounter}`);
    });
};
