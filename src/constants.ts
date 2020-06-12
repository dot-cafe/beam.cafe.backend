import * as path from 'path';

const dev = process.env.NODE_ENV === 'development';
const TEMPLATE_DIR = path.resolve(
    __dirname, dev ? '../dist/templates' : '../templates'
);

export const TEMPLATES = {
    ERROR_404: path.join(TEMPLATE_DIR, 'error-404.ejs'),
    DOWNLOAD: path.join(TEMPLATE_DIR, 'download.ejs'),
    DOWNLOAD_OFFLINE: path.join(TEMPLATE_DIR, 'download-offline.ejs'),
    DOWNLOAD_NOT_FOUND: path.join(TEMPLATE_DIR, 'download-notfound.ejs'),
    DOWNLOAD_GONE: path.join(TEMPLATE_DIR, 'download-gone.ejs')
};
