import {Request, Response} from 'express';
import {HostedFile}        from '../types';
import {CollectionItem}    from '../utils/db/CollectionItem';
import {Client}            from './Client';
import {clients}           from './clients';
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

export class Transmission extends CollectionItem {
    public readonly file: HostedFile;
    public readonly provider: Client;

    // Download status
    public status: TransmissionStatus = TransmissionStatus.Pending;
    private readonly downloaderRequest: Request;
    private readonly downloaderResponse: Response;

    // Amount of bytes transferred
    private bytesTransferred = 0;

    // The uploader's request and response
    private uploaderRequest: Request | null = null;
    private uploaderResponse: Response | null = null;

    // If headers has been send
    private headersSent = false;

    constructor(
        downloaderRequest: Request,
        downloaderResponse: Response,
        fileProvider: Client,
        file: HostedFile
    ) {
        super();
        this.downloaderRequest = downloaderRequest;
        this.downloaderResponse = downloaderResponse;
        this.provider = fileProvider;
        this.file = file;

        // Add to downloads and initiate transfer
        transmissions.add(this);
        fileProvider.requestFile(file.id, this.id);

        this.bindDownloaderEvents();
    }

    public cancel(): void {
        if (this.status === TransmissionStatus.Pending ||
            this.status === TransmissionStatus.Active) {

            // This raises a network-error on the client, end would lead to an incomplete file.
            this.downloaderResponse.destroy();
        }

        this.status = TransmissionStatus.Cancelled;
        transmissions.delete(this);
    }

    public accept(
        uploaderRequest: Request,
        uploaderResponse: Response
    ): void {
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
            downloaderResponse.attachment(this.file.serializedName);
            this.headersSent = true;
        }

        this.uploaderRequest = uploaderRequest;
        this.uploaderResponse = uploaderResponse;

        uploaderRequest.on('data', chunk => {
            if (clients.updateIPLimit(this.provider, chunk.length)) {
                uploaderRequest.destroy();

                // Triggers the close event
                downloaderResponse.destroy();
                this.provider.sendRateLimitInfo();
            } else {
                downloaderResponse.write(chunk);
                this.bytesTransferred += chunk.length;
            }
        });

        uploaderRequest.on('error', () => {
            downloaderResponse.end();

            // An error occured somewhere between both clients
            uploaderResponse.sendStatus(500);
            this.status = TransmissionStatus.Errored;

            // Clean up
            transmissions.delete(this);
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

            // Clean up
            transmissions.delete(this);
        });
    }

    private bindDownloaderEvents(): void {
        const {downloaderRequest, downloaderResponse} = this;

        // Maybe the downloaders browser itself has a timeout
        downloaderRequest.on('close', () => {
            if (this.status !== TransmissionStatus.Finished &&
                this.status !== TransmissionStatus.Cancelled &&
                this.status !== TransmissionStatus.PeerReset) {
                this.status = TransmissionStatus.PeerReset;
                this.provider.sendMessage('download-cancelled', this.id);

                // Cleanup
                transmissions.delete(this);
            }
        });

        // Dectect if the downloader closes the connection
        downloaderResponse.on('close', () => {
            if (this.status !== TransmissionStatus.Finished &&
                this.status !== TransmissionStatus.Cancelled) {
                this.status = TransmissionStatus.PeerReset;

                this.provider.sendMessage('download-cancelled', this.id);

                // Cleanup
                transmissions.delete(this);
            }
        });
    }
}
