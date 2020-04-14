import {Router}             from 'express';
import {clients, downloads} from '../state';
import {Client, HostedFile} from '../types';
import {removeItem}         from '../utils/array';
import {uid}                from '../utils/uid';

export const api = (): Router => {
    const router = Router();

    router.post('/share/:downloadId', (req, res) => {
        const {downloadId} = req.params;

        // Validate id
        if (typeof downloadId === 'string') {
            const request = downloads.find(v => v.downloadId === downloadId);

            if (request) {

                // Pipe file
                if (!request.headersSent) {
                    request.headersSent = true;
                    request.downloaderResponse.set('Content-Length', String(request.file.size));
                    request.downloaderResponse.attachment(request.file.name);
                }

                request.uploaderRequest = req;
                request.uploaderResponse = res;
                req.addListener('data', chunk => {
                    request.downloaderResponse.write(chunk);
                    request.bytesTransferred += chunk.length;
                });

                req.addListener('error', () => {

                    // An error occured somewhere between both clients
                    request.downloaderResponse.status(500);
                    request.downloaderResponse.send();
                    res.sendStatus(500);

                    // Clean up
                    removeItem(downloads, request);
                });

                req.addListener('end', () => {

                    // Finish requests
                    request.downloaderResponse.status(200);
                    request.downloaderResponse.send();
                    res.sendStatus(200);

                    // Clean up
                    removeItem(downloads, request);
                });

                return;
            }
        }

        res.sendStatus(400);
    });

    router.get('/shared/:fileKey', (req, res) => {
        const {fileKey} = req.params;

        // Validate id
        if (typeof fileKey === 'string') {
            let provider: Client, hostedFile: HostedFile;

            for (const client of clients) {
                for (const file of client.files) {
                    if (file.key === fileKey) {
                        hostedFile = file;
                        provider = client;
                        break;
                    }
                }
            }

            // Validate provider
            if (provider && hostedFile) {
                const downloadId = uid();

                // Put request on hold
                downloads.push({
                    bytesTransferred: 0,
                    headersSent: false,
                    file: hostedFile,
                    downloaderResponse: res,
                    uploaderResponse: null,
                    uploaderRequest: null,
                    downloadId,
                    fileProvider: provider
                });

                // Request file
                provider.socket.send(JSON.stringify({
                    type: 'file-request',
                    payload: {
                        fileKey,
                        downloadId
                    }
                }));
                return;
            }
        }

        res.sendStatus(400);
    });

    return router;
};
