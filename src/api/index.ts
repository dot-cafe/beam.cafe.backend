import {Router}                                         from 'express';
import {Client}                                         from '../classes/Client';
import {Download}                                       from '../classes/Download';
import {TEMPLATE_DOWNLOAD, TEMPLATE_DOWNLOAD_NOT_FOUND} from '../constants';
import {minifyHtml}                                     from '../utils/minify-html';
import prettyBytes                                      from 'pretty-bytes';
import ejs                                              from 'ejs';

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

    router.get('/d/:id', (req, res) => {
        const resolved = Client.resolveFile(req.params.id);
        const file = resolved ? resolved[1] : null;

        ejs.renderFile(file ? TEMPLATE_DOWNLOAD : TEMPLATE_DOWNLOAD_NOT_FOUND, {
            prettyBytes,
            file: file ? {
                ...file,
                prettySize: prettyBytes(file.size)
            } : null
        }, {}, (err, str) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(minifyHtml(str));
            }
        });
    });

    return router;
};
