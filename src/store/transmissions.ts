import {Request, Response}                from 'express';
import {config}                           from '../config';
import {log, LogLevel}                    from '../logging';
import {uid}                              from '../utils/uid';
import {Client}                           from './Client';
import {Transmission, TransmissionStatus} from './Transmission';

type TransmissionRedirect = {
    timeout: number;
    fileId: string;
}

// TODO: DB Superclass?
export const transmissions = new class extends Set<Transmission> {

    /**
     * For each download a special url will be made to block further
     * download attempts by the browser in case the user cancelled the download.
     * These are only valid for 1 minute.
     */
    private readonly redirects: Map<string, TransmissionRedirect> = new Map();

    public byId(id: string): Transmission | null {
        for (const item of this) {
            if (item.id === id) {
                return item;
            }
        }

        return null;
    }

    public byClient(client: Client): Array<Transmission> {
        return [...this].filter(value => value.provider === client);
    }

    public byFileId(id: string): Array<Transmission> {
        return [...this].filter(value => value.file.id === id);
    }

    public createTransmissionKey(fileId: string): string {
        const downloadId = uid(64);

        this.redirects.set(downloadId, {
            fileId,
            timeout: setTimeout(() => {
                this.redirects.delete(downloadId);
            }, config.security.downloadKeyMaxAge) as unknown as number
        });

        return downloadId;
    }

    public checkTransmissionKey(downloadId: string): boolean {
        return this.redirects.has(downloadId);
    }

    public removeTransmissionKey(downloadId: string): boolean {
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
            log('accept-upload-failed', {
                reason: 'Download not found.',
                downloadId
            }, LogLevel.INFO);
            return false;
        } else if (download.status !== TransmissionStatus.Pending) {
            log('accept-upload-failed', {
                reason: 'Upload already active.',
                downloadId
            }, LogLevel.INFO);
            return false;
        }

        download.accept(uploaderRequest, uploaderResponse);
        return true;
    }

    public cancelUpload(downloadId: unknown): boolean {
        if (typeof downloadId !== 'string') {
            return false;
        }

        const download = this.byId(downloadId);
        if (download) {
            download.cancel();
            return true;
        }

        log('cancel-upload-failed', {
            reason: 'Cannot find download.',
            downloadId
        }, LogLevel.WARNING);
        return false;
    }
};
