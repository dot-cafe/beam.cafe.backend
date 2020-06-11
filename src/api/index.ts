import {Router} from 'express';
import backend  from './backend';
import root     from './root';

export const api = (): Router => {
    const router = Router();
    router.use('/b/', backend());
    router.use('/', root());

    return router;
};
