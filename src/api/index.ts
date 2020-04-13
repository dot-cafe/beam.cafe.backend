import {Response, Router}   from 'express';
import {clients}            from '../socket';
import {Client, HostedFile} from '../socket/client';

type PendingDownload = {
    target: Response;
    file: HostedFile;
    id: string;
};

export const api = (): Router => {
    const router = Router();
    const pendingDownloads: Array<PendingDownload> = [];

    router.post('/share/:id', (req, res) => {
        const {id} = req.params;

        // Validate id
        if (typeof id === 'string') {
            const request = pendingDownloads.find(v => v.id === id);

            if (request) {

                // Pipe file
                request.target.attachment(request.file.name);
                req.pipe(request.target);
                res.sendStatus(200);
                return;
            }
        }

        res.sendStatus(404);
    });

    router.get('/shared/:id', (req, res) => {
        const {id} = req.params;

        // Validate id
        if (typeof id === 'string') {
            let provider: Client, hostedFile: HostedFile;

            for (const client of clients) {
                for (const file of client.files) {
                    if (file.keys.includes(id)) {
                        hostedFile = file;
                        provider = client;
                        break;
                    }
                }
            }

            // Validate provider
            if (provider && hostedFile) {

                // Put request on hold
                pendingDownloads.push({
                    file: hostedFile,
                    target: res,
                    id
                });

                // Request file
                provider.socket.send(JSON.stringify({
                    type: 'req-file',
                    payload: id
                }));
            } else {
                // TODO: What now?
            }
        }
    });

    return router;
};
