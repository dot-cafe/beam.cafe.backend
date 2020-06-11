import {Router}     from 'express';
import {TEMPLATES}  from '../constants';
import {Client}     from '../store/Client';
import {clients}    from '../store/clients';
import {HostedFile} from '../types';
import {renderEJS}  from '../utils/render-ejs';

export default (): Router => {
    const router = Router();

    router.get('/d/:id', (req, res) => {
        const resolved = clients.resolveFile(req.params.id);
        let template = TEMPLATES.DOWNLOAD_NOT_FOUND;
        let file: HostedFile | null = null;
        let user: Client | null = null;

        if (resolved) {
            [user, file] = resolved;

            // Change template if user is offline
            if (user.disconnected) {
                template = TEMPLATES.DOWNLOAD_OFFLINE;
            } else {
                template = TEMPLATES.DOWNLOAD;
            }
        }

        // TODO: Response code?
        renderEJS(template, res, {file, user});
    });

    return router;
};
