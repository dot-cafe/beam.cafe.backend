import {Router}    from 'express';
import {TEMPLATES} from '../constants';
import {clients}      from '../store/clients';
import {Transmission}  from '../store/Transmission';
import {transmissions} from '../store/transmissions';
import {renderEJS}     from '../utils/render-ejs';

export const api = (): Router => {
    const router = Router();

    router.post('/file/:id', (req, res) => {

        // Validate id
        if (transmissions.acceptUpload(req, res, req.params.id)) {
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
                if (transmissions.removeDownloadKey(hash)) {

                    // Start download
                    const [client, file] = resolved;
                    new Transmission(req, res, client, file);
                    return;
                }
            } else {

                // Create new, unique download-key and redirect client
                const key = transmissions.createDownloadKey(id);
                res.redirect(303, `/file/${id}/${key}`);
                return;
            }
        }

        renderEJS(TEMPLATES.DOWNLOAD_GONE, res);
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

        renderEJS(template, res, {file});
    });

    return router;
};
