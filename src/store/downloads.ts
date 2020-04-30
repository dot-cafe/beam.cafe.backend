import {Request, Response}        from 'express';
import {log, LogLevel}            from '../logging';
import {Client}                   from './Client';
import {Download, DownloadStatus} from './Download';

export const downloads = new class {
    private readonly list: Set<Download> = new Set();

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

    public acceptUpload(
        uploaderRequest: Request,
        uploaderResponse: Response,
        downloadId: string
    ): boolean {
        const download = this.byId(downloadId);

        if (!download) {
            log(`Invalid download; ID: ${downloadId}`, LogLevel.VERBOSE);
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

        log(`Cannot find download to cancel; ID: ${downloadId}`, LogLevel.VERBOSE);
        return false;
    }
};
