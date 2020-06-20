import {Router}        from 'express';
import {TEMPLATES}     from '../constants';
import {clients}       from '../store/clients';
import {Stream}        from '../store/Stream';
import {streams}       from '../store/streams';
import {Transmission}  from '../store/Transmission';
import {transmissions} from '../store/transmissions';
import {renderEjs}     from '../utils/render-ejs';

export default (): Router => {
    const router = Router();

    router.post('/file/:id', (req, res) => {
        if (transmissions.acceptUpload(req, res, req.params.id)) {
            return;
        }

        res.sendStatus(400);
    });

    router.post('/stream/:id', (req, res) => {
        switch (streams.acceptTransfer(req, res, req.params.id)) {

            // Stream cancalled
            case -1: {
                res.sendStatus(204);
                break;
            }

            // Invalid - request already in progress
            case 0: {
                res.sendStatus(400);
            }
        }
    });

    router.get('/file/:id/:hash?', (req, res) => {
        const {id, hash} = req.params;
        const resolved = clients.resolveFile(id);

        // Validate provider
        if (resolved) {
            const [client, file] = resolved;

            // Check transfer-limit
            if (clients.checkIPLimit(client, file.size)) {
                return renderEjs({
                    template: TEMPLATES.DOWNLOAD_RATE_LIMITED,
                    response: res,
                    status: 403
                });
            }

            // Check if download-hash is present
            if (hash) {

                // Check if reservation can be removed
                if (transmissions.removeTransmissionKey(hash)) {

                    // Start download
                    new Transmission(req, res, client, file);
                    return;
                }
            } else {

                // Create new, unique download-key and redirect client
                transmissions.createTransmissionKey(id).then(key => {
                    res.redirect(303, `/b/file/${id}/${key}`);
                });
                return;
            }
        }

        renderEjs({
            template: TEMPLATES.DOWNLOAD_GONE,
            response: res,
            status: 410
        });
    });

    router.get('/stream/:id/:hash?', (req, res) => {
        const {id, hash} = req.params;
        const resolved = clients.resolveFile(id);

        // Validate provider and check if streams are allowed by this user
        if (resolved && resolved[0].settings.allowStreaming) {
            const [client, file] = resolved;

            // Check transfer-limit
            if (clients.checkIPLimit(client, file.size)) {
                return renderEjs({
                    template: TEMPLATES.DOWNLOAD_RATE_LIMITED,
                    response: res,
                    status: 403
                });
            }

            // Check if download-hash is present
            if (hash) {

                // Validate transmission
                if (streams.checkStreamKey(hash)) {

                    // Start stream
                    new Stream(req, res, client, file, hash);
                    return;
                }
            } else {

                // Create new, unique stream-key and redirect client
                streams.createStreamKey(id).then(key => {
                    res.redirect(302, `/b/stream/${id}/${key}`);
                });
                return;
            }
        }

        renderEjs({
            template: TEMPLATES.DOWNLOAD_GONE,
            response: res,
            status: 410
        });
    });

    return router;
};
