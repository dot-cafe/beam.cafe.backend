import ejs          from 'ejs';
import {Response}   from 'express';
import prettyBytes  from 'pretty-bytes';
import {minifyHtml} from './minify-html';

export type RenderEjsPayload = {
    template: string;
    response: Response;
    status?: number;
    data?: Record<string, unknown>;
}

const dev = process.env.NODE_ENV === 'development';
export const renderEJS = (
    {
        template,
        response,
        data = {},
        status = 200
    }: RenderEjsPayload
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

            response.sendStatus(500);
        } else {
            response.status(status);
            response.send(minifyHtml(str));
        }
    });
};
