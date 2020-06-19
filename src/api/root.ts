import {Router}     from 'express';
import {TEMPLATES}  from '../constants';
import {Client}     from '../store/Client';
import {clients}    from '../store/clients';
import {HostedFile} from '../types';
import {renderEJS}  from '../utils/renderEJS';

export default (): Router => {
    const router = Router();

    router.get('/d/:id', (req, res) => {
        const resolved = clients.resolveFile(req.params.id);
        let template = TEMPLATES.DOWNLOAD_NOT_FOUND;
        let file: HostedFile | null = null;
        let user: Client | null = null;
        let status = 404;

        if (resolved) {
            [user, file] = resolved;

            // Change template if user is offline
            if (user.disconnected) {
                status = 423;
                template = TEMPLATES.DOWNLOAD_OFFLINE;
            } else {
                status = 200;
                template = TEMPLATES.DOWNLOAD;
            }
        }

        renderEJS({
            template, status,
            response: res,
            data: {file, user}
        });
    });

    return router;
};
