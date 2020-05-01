import * as path from 'path';

const TEMPLATE_DIR = path.resolve(__dirname, '../html/templates');
export const TEMPLATES = {
    DOWNLOAD: path.join(TEMPLATE_DIR, 'download.ejs'),
    DOWNLOAD_OFFLINE: path.join(TEMPLATE_DIR, 'download.offline.ejs'),
    DOWNLOAD_NOT_FOUND: path.join(TEMPLATE_DIR, 'download.notfound.ejs')
};
