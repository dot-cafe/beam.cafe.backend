import {Request, Response} from 'express';
import {log, LogLevel}     from '../logging';
import {HostedFile}        from '../types';
import {removeItem}        from '../utils/array';
import {uid}               from '../utils/uid';
import {Client}            from './Client';

/**
 * Status of a download
 */
export enum DownloadStatus {
    Pending = 'Pending',
    Active = 'Active',
    Finished = 'Finished',
    Errored = 'Errored',
    Cancelled = 'Cancelled',
    PeerReset = 'PeerReset',
}

export class Download {
    public static downloads: Array<Download> = [];

    // Download ID
    public readonly id: string;

    // The file
    public readonly file: HostedFile;

    // The uploader / source
    private readonly provider: Client;

    // The downloader's response
    private readonly downloaderResponse: Response;

    // Download status
    private status: DownloadStatus = DownloadStatus.Pending;
    private done = false;

    // Amount of bytes transferred
    private bytesTransferred = 0;

    // The uploader's request and response
    private uploaderRequest: Request | null = null;
    private uploaderResponse: Response | null = null;

    // If headers has been send
    private headersSent = false;

    constructor(
        downloaderResponse: Response,
        fileProvider: Client,
        file: HostedFile
    ) {
        this.downloaderResponse = downloaderResponse;
        this.provider = fileProvider;
        this.file = file;
        this.id = uid();

        // Initiate transfer
        fileProvider.requestFile(file.id, this.id);
        Download.downloads.push(this);
        log(`Download started; ID: ${this.id}`);
    }

    public static byId(id: string): Download | null {
        return Download.downloads.find(v => v.id === id) || null;
    }

    public static fromClient(client: Client): Array<Download> {
        return Download.downloads.filter(value => value.provider === client);
    }

    public static acceptUpload(
        uploaderRequest: Request,
        uploaderResponse: Response,
        downloadId: string
    ): boolean {
        const download = Download.byId(downloadId);

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

    public static cancelUpload(downloadId: string): boolean {
        const download = Download.byId(downloadId);

        if (download && (
            download.status === DownloadStatus.Pending ||
            download.status === DownloadStatus.Active
        )) {
            download.cancel();
            return true;
        }

        log(`Cannot find download to cancel; ID: ${downloadId}`, LogLevel.ERROR);
        return false;
    }

    public static remove(download: Download): void {
        removeItem(Download.downloads, download);
    }

    public remove(): void {
        Download.remove(this);
    }

    public cancel(): void {
        this.status = DownloadStatus.Cancelled;

        if (!this.done) {
            this.downloaderResponse.status(410);
            this.downloaderResponse.send('Cancelled by peer.');
        }

        // The client / uploader is responsible for cancelling their upload!
    }

    public accept(
        uploaderRequest: Request,
        uploaderResponse: Response
    ): void {
        const {downloaderResponse} = this;

        // Pipe file
        if (!this.headersSent) {
            this.headersSent = true;
            this.status = DownloadStatus.Active;
            downloaderResponse.set('Content-Length', String(this.file.size));
            downloaderResponse.attachment(this.file.name);
        }

        this.uploaderRequest = uploaderRequest;
        this.uploaderResponse = uploaderResponse;

        uploaderRequest.on('data', chunk => {
            downloaderResponse.write(chunk);
            this.bytesTransferred += chunk.length;
        });

        uploaderRequest.on('error', () => {

            // An error occured somewhere between both clients
            downloaderResponse.status(500);
            downloaderResponse.send();
            this.status = DownloadStatus.Errored;

            this.done = true;
            uploaderResponse.sendStatus(500);

            // Clean up
            Download.remove(this);
        });

        uploaderRequest.on('end', () => {

            // Finish requests
            this.status = DownloadStatus.Finished;
            downloaderResponse.status(200);
            downloaderResponse.send();

            this.done = true;
            uploaderResponse.sendStatus(200);

            // Clean up
            Download.remove(this);
        });

        // Dectect if the downloader closes the connection
        downloaderResponse.on('close', () => {
            if (this.status !== DownloadStatus.Finished &&
                this.status !== DownloadStatus.Cancelled) {

                this.status = DownloadStatus.PeerReset;
                this.done = true;

                this.provider.socket.send(JSON.stringify({
                    type: 'download-cancelled',
                    payload: this.id
                }));
            }
        });
    }
}
