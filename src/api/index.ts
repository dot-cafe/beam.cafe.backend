import {Router}                             from 'express';
import {clients, downloads}                 from '../state';
import {Client, DownloadStatus, HostedFile} from '../types';
import {removeItem}                         from '../utils/array';
import {uid}                                from '../utils/uid';

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
                    request.status = DownloadStatus.ACTIVE;
                    request.dRes.set('Content-Length', String(request.file.size));
                    request.dRes.attachment(request.file.name);
                }

                request.uReq = req;
                request.uRes = res;

                req.on('data', chunk => {
                    request.dRes.write(chunk);
                    request.bytesTransferred += chunk.length;
                });

                req.on('error', () => {
                    console.log('error');

                    // An error occured somewhere between both clients
                    request.dRes.status(500);
                    request.dRes.send();
                    request.status = DownloadStatus.ERRORED;
                    res.sendStatus(500);

                    // Clean up
                    removeItem(downloads, request);
                });

                req.on('end', () => {

                    // Finish requests
                    request.dRes.status(200);
                    request.dRes.send();
                    request.status = DownloadStatus.FINISHED;
                    res.sendStatus(200);

                    // Clean up
                    removeItem(downloads, request);
                });

                // Dectect if the downloader closes the connection
                request.dRes.on('close', () => {
                    if (request.status !== DownloadStatus.FINISHED) {
                        request.fileProvider.socket.send(JSON.stringify({
                            type: 'download-cancelled',
                            payload: request.downloadId
                        }));
                    }
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
                    downloadId,
                    status: DownloadStatus.PENDING,
                    bytesTransferred: 0,
                    fileProvider: provider,
                    uRes: null,
                    uReq: null,
                    file: hostedFile,
                    dRes: res,
                    headersSent: false
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
