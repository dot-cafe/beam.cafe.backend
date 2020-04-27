import * as path from 'path';

export const TEMPLATE_DIR = path.resolve(__dirname, '../html/templates');
export const TEMPLATE_DOWNLOAD = path.join(TEMPLATE_DIR, 'download.ejs');
export const TEMPLATE_DOWNLOAD_NOT_FOUND = path.join(TEMPLATE_DIR, 'download.notfound.ejs');
