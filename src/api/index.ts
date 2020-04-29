import ejs                                                                         from 'ejs';
import {Router}                                                                    from 'express';
import prettyBytes                                                                 from 'pretty-bytes';
import {Client}                                                                    from '../classes/Client';
import {Download}                                                                  from '../classes/Download';
import {TEMPLATE_DOWNLOAD, TEMPLATE_DOWNLOAD_NOT_FOUND, TEMPLATE_DOWNLOAD_OFFLINE} from '../constants';
import {minifyHtml}                                                                from '../utils/minify-html';

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
        let template = TEMPLATE_DOWNLOAD_NOT_FOUND;
        let file: unknown = null;

        if (resolved) {
            const [user, resolvedFile] = resolved;

            // Change template if user is offline
            if (user.isDisconnected()) {
                template = TEMPLATE_DOWNLOAD_OFFLINE;
            } else {
                template = TEMPLATE_DOWNLOAD;
                file = resolvedFile;
            }
        }

        ejs.renderFile(template, {
            prettyBytes, file
        }, {}, (err, str) => {
            if (err) {
                res.sendStatus(500);
            } else {
                res.send(minifyHtml(str));
            }
        });
    });

    return router;
};
