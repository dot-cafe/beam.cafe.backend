import {Request, Response} from 'express';
import {log, LogLevel}     from '../logging';
import {HostedFile}        from '../types';
import {uid}               from '../utils/uid';
import {Client}            from './Client';
import {transmissions}     from './transmissions';

/**
 * Status of a download
 */
export enum TransmissionStatus {
    Pending = 'Pending',
    Active = 'Active',
    Finished = 'Finished',
    Errored = 'Errored',
    Cancelled = 'Cancelled',
    PeerReset = 'PeerReset',
}

export class Transmission {
    private readonly downloaderResponse: Response;
    public readonly id: string;
    public readonly file: HostedFile;
    public readonly provider: Client;

    // Download status
    public status: TransmissionStatus = TransmissionStatus.Pending;
    public done = false;

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

        // Add to downloads and initiate transfer
        transmissions.add(this);
        fileProvider.requestFile(file.id, this.id);
    }

    public cancel(): void {
        if (this.status === TransmissionStatus.Pending ||
            this.status === TransmissionStatus.Active) {

            // This raises a network-error on the client, end would lead to an incomplete file.
            this.downloaderResponse.destroy();
        }

        this.status = TransmissionStatus.Cancelled;
        transmissions.remove(this);
    }

    public accept(
        uploaderRequest: Request,
        uploaderResponse: Response
    ): void {
        if (this.status !== TransmissionStatus.Pending) {
            log('upload-failed', {
                reason: 'Upload rejected because the download is not in a pending state.',
                downloadId: this.id,
                fileId: this.file.id,
                userId: this.provider.id
            }, LogLevel.ERROR);
            return;
        }

        const {downloaderResponse} = this;
        this.status = TransmissionStatus.Active;
        if (!this.headersSent) {

            /**
             * Everything gets transferred within one single chunk.
             * This way we can easily abort the reponse which is not possible with a
             * "non-streaming" connection.
             */
            downloaderResponse.set('Content-Length', String(this.file.size));
            downloaderResponse.set('Content-Type', 'application/octet-stream');
            downloaderResponse.set('Transfer-Encoding', 'chunked');
            downloaderResponse.attachment(this.file.name);
            this.headersSent = true;
        }

        this.uploaderRequest = uploaderRequest;
        this.uploaderResponse = uploaderResponse;

        uploaderRequest.on('data', chunk => {
            downloaderResponse.write(chunk);
            this.bytesTransferred += chunk.length;
        });

        uploaderRequest.on('error', () => {
            downloaderResponse.end();

            // An error occured somewhere between both clients
            uploaderResponse.sendStatus(500);
            this.status = TransmissionStatus.Errored;
            this.done = true;

            // Clean up
            transmissions.remove(this);
        });

        uploaderRequest.on('close', () => {

            // Upload is either cancelled or "paused"
            if (
                this.status !== TransmissionStatus.Cancelled &&
                this.bytesTransferred < this.file.size
            ) {
                this.status = TransmissionStatus.Pending;
            }
        });

        uploaderRequest.on('end', () => {
            downloaderResponse.end();

            // Finish requests
            uploaderResponse.sendStatus(200);
            this.status = TransmissionStatus.Finished;
            this.done = true;

            // Clean up
            transmissions.remove(this);
        });

        // Dectect if the downloader closes the connection
        downloaderResponse.on('close', () => {
            if (this.status !== TransmissionStatus.Finished &&
                this.status !== TransmissionStatus.Cancelled) {

                this.status = TransmissionStatus.PeerReset;
                this.done = true;

                this.provider.sendMessage('download-cancelled', this.id);

                // Cleanup
                transmissions.remove(this);
            }
        });
    }
}