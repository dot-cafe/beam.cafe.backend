import {Router}    from 'express';
import {TEMPLATES} from '../constants';
import {clients}   from '../store/clients';
import {Download}  from '../store/Download';
import {downloads} from '../store/downloads';
import {renderEJS} from '../utils/render-ejs';

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
                    return;
                }
            } else {

                // Create new, unique download-key and redirect client
                const key = downloads.createDownloadKey(id);
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
        let user: unknown = null;

        if (resolved) {
            const [resolvedUser, resolvedFile] = resolved;

            // Change template if resolvedUser is offline
            if (resolvedUser.disconnected) {
                template = TEMPLATES.DOWNLOAD_OFFLINE;
            } else {
                template = TEMPLATES.DOWNLOAD;
                file = resolvedFile;
                user = resolvedUser;
            }
        }

        renderEJS(template, res, {user, file});
    });

    return router;
};
