import {Router}   from 'express';
import {Client}   from '../classes/Client';
import {Download} from '../classes/Download';

export const api = (): Router => {
    const router = Router();

    router.post('/file/:id', (req, res) => {

        // Validate id
        if (Download.acceptUpload(req, res, req.params.id)) {
            return;
        }

        res.sendStatus(400);
    });

    router.get('/file/:id', (req, res) => {
        const resolved = Client.resolveFile(req.params.id);

        // Validate provider
        if (resolved) {
            new Download(res, resolved[0], resolved[1]);
            return;
        }

        res.sendStatus(400);
    });

    return router;
};
