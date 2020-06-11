import ejs          from 'ejs';
import {Response}   from 'express';
import prettyBytes  from 'pretty-bytes';
import {minifyHtml} from './minify-html';

const dev = process.env.NODE_ENV === 'development';
export const renderEJS = (
    template: string,
    res: Response,
    data: Record<string, unknown> = {}
): void => {
    ejs.renderFile(template, {
        prettyBytes,
        ...data
    }, {
        cache: !dev
    }, (err, str) => {
        if (err) {

            if (dev) {
                /* eslint-disable no-console */
                console.error(err);
            }

            res.sendStatus(500);
        } else {
            res.send(minifyHtml(str));
        }
    });
};
