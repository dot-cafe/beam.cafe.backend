import {Response, Router}   from 'express';
import {clients}            from '../socket';
import {Client, HostedFile} from '../socket/client';
import {uid}                from '../utils/uid';

type PendingDownload = {
    downloadId: string;
    target: Response;
    file: HostedFile;
    started: boolean;
    transferred: number;
};

export const api = (): Router => {
    const router = Router();
    const pendingDownloads: Array<PendingDownload> = [];

    router.post('/share/:downloadId', (req, res) => {
        const {downloadId} = req.params;

        // Validate id
        if (typeof downloadId === 'string') {
            const request = pendingDownloads.find(v => v.downloadId === downloadId);

            if (request) {

                // Pipe file
                if (!request.started) {
                    request.started = true;
                    request.target.set('Content-Length', String(request.file.size));
                    request.target.attachment(request.file.name);
                }

                req.addListener('data', chunk => {
                    request.target.write(chunk);
                    request.transferred += chunk.length;
                });

                req.addListener('end', () => {
                    request.target.status(200);
                    request.target.send();
                    res.sendStatus(200);
                });
            }
        }
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
                pendingDownloads.push({
                    transferred: 0,
                    started: false,
                    file: hostedFile,
                    target: res,
                    downloadId
                });

                // Request file
                provider.socket.send(JSON.stringify({
                    type: 'file-request',
                    payload: {
                        fileKey,
                        downloadId
                    }
                }));
            } else {
                // TODO: What now?
            }
        }
    });

    return router;
};
