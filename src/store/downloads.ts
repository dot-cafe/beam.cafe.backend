import {Request, Response}        from 'express';
import {config}                   from '../config';
import {log, LogLevel}            from '../logging';
import {uid}                      from '../utils/uid';
import {Client}                   from './Client';
import {Download, DownloadStatus} from './Download';

type DownloadRedirect = {
    timeout: number;
    fileId: string;
}

export const downloads = new class {
    private readonly list: Set<Download> = new Set();

    /**
     * For each download a special url will be made to block further
     * download attempts by the browser in case the user cancelled the download.
     * These are only valid for 1 minute.
     */
    private readonly redirects: Map<string, DownloadRedirect> = new Map();

    public get amount(): number {
        return this.list.size;
    }

    public add(download: Download): void {
        this.list.add(download);
    }

    public remove(download: Download): void {
        this.list.delete(download);
        log(`Download removed; Remaining: ${downloads.amount}`, LogLevel.SILLY);
    }

    public byId(id: string): Download | null {
        for (const item of this.list) {
            if (item.id === id) {
                return item;
            }
        }

        return null;
    }

    public byClient(client: Client): Array<Download> {
        return [...this.list].filter(value => value.provider === client);
    }

    public byFileId(id: string): Array<Download> {
        return [...this.list].filter(value => value.file.id === id);
    }

    public createDownloadKey(fileId: string): string {
        const downloadId = uid(64);

        this.redirects.set(downloadId, {
            fileId,
            timeout: setTimeout(() => {
                this.redirects.delete(downloadId);
            }, config.security.downloadKeyMaxAge) as unknown as number
        });

        return downloadId;
    }

    public removeDownloadKey(downloadId: string): boolean {
        const item = this.redirects.get(downloadId);

        if (!item) {
            return false;
        }

        clearTimeout(item.timeout);
        this.redirects.delete(downloadId);
        return true;
    }

    public acceptUpload(
        uploaderRequest: Request,
        uploaderResponse: Response,
        downloadId: string
    ): boolean {
        const download = this.byId(downloadId);

        if (!download) {
            log(`Invalid download; Download ID: ${downloadId}`, LogLevel.VERBOSE);
            return false;
        } else if (download.status !== DownloadStatus.Pending) {
            log('Upload is already active', LogLevel.ERROR);
            return false;
        }

        download.accept(uploaderRequest, uploaderResponse);
        return true;
    }

    public cancelUpload(downloadId: string): boolean {
        const download = this.byId(downloadId);

        if (download) {
            download.cancel();
            return true;
        }

        log(`Cannot find download to cancel; Download ID: ${downloadId}`, LogLevel.VERBOSE);
        return false;
    }
};
