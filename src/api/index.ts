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
            const download = downloads.find(v => v.downloadId === downloadId);

            if (download) {

                // Pipe file
                if (!download.headersSent) {
                    download.headersSent = true;
                    download.status = DownloadStatus.Active;
                    download.dRes.set('Content-Length', String(download.file.size));
                    download.dRes.attachment(download.file.name);
                }

                download.uReq = req;
                download.uRes = res;

                req.on('data', chunk => {
                    download.dRes.write(chunk);
                    download.bytesTransferred += chunk.length;
                });

                req.on('error', () => {

                    // An error occured somewhere between both clients
                    download.dRes.status(500);
                    download.dRes.send();
                    download.status = DownloadStatus.Errored;
                    res.sendStatus(500);

                    // Clean up
                    removeItem(downloads, download);
                });

                req.on('end', () => {

                    // Finish requests
                    download.dRes.status(200);
                    download.dRes.send();
                    download.status = DownloadStatus.Finished;
                    res.sendStatus(200);

                    // Clean up
                    removeItem(downloads, download);
                });

                // Dectect if the downloader closes the connection
                download.dRes.on('close', () => {
                    if (download.status !== DownloadStatus.Finished &&
                        download.status !== DownloadStatus.Cancelled) {
                        download.status = DownloadStatus.PeerReset;
                        download.fileProvider.socket.send(JSON.stringify({
                            type: 'download-cancelled',
                            payload: download.downloadId
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
                const download = {
                    downloadId,
                    status: DownloadStatus.Pending,
                    bytesTransferred: 0,
                    fileProvider: provider,
                    uRes: null,
                    uReq: null,
                    file: hostedFile,
                    dRes: res,
                    headersSent: false
                };

                downloads.push(download);

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
