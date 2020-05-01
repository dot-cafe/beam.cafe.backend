import ejs          from 'ejs';
import {Router}     from 'express';
import prettyBytes  from 'pretty-bytes';
import {TEMPLATES}  from '../constants';
import {clients}    from '../store/clients';
import {Download}   from '../store/Download';
import {downloads}  from '../store/downloads';
import {minifyHtml} from '../utils/minify-html';

export const api = (): Router => {
    const router = Router();

    router.post('/file/:id', (req, res) => {

        // Validate id
        if (downloads.acceptUpload(req, res, req.params.id)) {
            return;
        }

        res.sendStatus(400);
    });

    router.get('/file/:id/:hash?', (req, res) => {
        const {id, hash} = req.params;
        const resolved = clients.resolveFile(id);

        // Validate provider
        if (resolved) {

            // Check if download-hash is present
            if (hash) {

                // Check if reservation can be removed
                if (downloads.removeDownloadKey(hash)) {

                    // Start download
                    const [client, file] = resolved;
                    new Download(res, client, file);
                } else {

                    // Resource is gone, reduced to atoms
                    res.sendStatus(410);
                }
            } else {

                // Create new, unique download-key and redirect client
                const key = downloads.createDownloadKey(id);
                res.redirect(303, `/file/${id}/${key}`);
            }

            return;
        }

        res.sendStatus(404);
    });

    router.get('/d/:id', (req, res) => {
        const resolved = clients.resolveFile(req.params.id);
        let template = TEMPLATES.DOWNLOAD_NOT_FOUND;
        let file: unknown = null;

        if (resolved) {
            const [user, resolvedFile] = resolved;

            // Change template if user is offline
            if (user.disconnected) {
                template = TEMPLATES.DOWNLOAD_OFFLINE;
            } else {
                template = TEMPLATES.DOWNLOAD;
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
