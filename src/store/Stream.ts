import {Request, Response}                     from 'express';
import mime                                    from 'mime-types';
import {log, LogLevel}                         from '../logging';
import {HostedFile}                            from '../types';
import {ByteRangeHeader, parseByteRangeHeader} from '../utils/parseByteRangeHeader';
import {uid}                                   from '../utils/uid';
import {Client}                                from './Client';
import {streams}                               from './streams';

/**
 * Status of a stream
 */
export enum StreamStatus {
    Pending = 'Pending',
    Streaming = 'Streaming',
    Finished = 'Finished',
    Errored = 'Errored',
    Cancelled = 'Cancelled'
}

export class Stream {
    public readonly hadRange: boolean;
    public readonly range: ByteRangeHeader;
    public readonly id: string;
    public readonly file: HostedFile;
    public readonly provider: Client;

    // Stream status
    public status: StreamStatus = StreamStatus.Pending;
    private readonly downloaderRequest: Request;
    private readonly downloaderResponse: Response;

    // The uploader's request and response
    private uploaderRequest: Request | null = null;
    private uploaderResponse: Response | null = null;

    constructor(
        downloaderRequest: Request,
        downloaderResponse: Response,
        fileProvider: Client,
        file: HostedFile,
        streamKey: string
    ) {
        this.downloaderRequest = downloaderRequest;
        this.downloaderResponse = downloaderResponse;
        this.provider = fileProvider;
        this.file = file;
        this.id = uid();

        // Add to downloads and initiate transfer
        streams.add(this);

        const rangeString = downloaderRequest.header('Range');
        const range: [number, number] = rangeString ? parseByteRangeHeader(rangeString, file.size) : [0, file.size];
        this.range = range;
        this.hadRange = !!rangeString;

        fileProvider.requestStream(file.id, this.id, streamKey, range);
        this.bindDownloaderEvents();
    }

    public cancel(): void {
        if (this.status === StreamStatus.Pending ||
            this.status === StreamStatus.Streaming) {

            // This raises a network-error on the client, end would lead to an incomplete file.
            this.downloaderResponse.destroy();
        }

        this.status = StreamStatus.Cancelled;
        streams.delete(this);
    }

    public accept(
        uploaderRequest: Request,
        uploaderResponse: Response
    ): void {
        if (this.status !== StreamStatus.Pending) {

            log('upload-failed', {
                reason: 'Upload rejected because the download is not in a pending state.',
                downloadId: this.id,
                fileId: this.file.id,
                userId: this.provider.id
            }, LogLevel.ERROR);
            return;
        }

        const {downloaderResponse, range, file} = this;
        this.status = StreamStatus.Streaming;

        downloaderResponse.writeHead(this.hadRange ? 206 : 200, {
            'Content-Range': `bytes ${range[0]}-${range[1]}/${file.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': `${range[1] - range[0]}`,
            'Content-Type': mime.lookup(file.name)
        });

        this.uploaderRequest = uploaderRequest;
        this.uploaderResponse = uploaderResponse;

        uploaderRequest.on('data', chunk => {
            downloaderResponse.write(chunk);
        });

        uploaderRequest.on('error', () => {
            downloaderResponse.end();

            // An error occured somewhere between both clients
            this.status = StreamStatus.Errored;

            // Clean up
            streams.delete(this);
        });

        uploaderRequest.on('close', () => {
            if (this.status !== StreamStatus.Cancelled) {
                this.status = StreamStatus.Pending;
            }
        });

        uploaderRequest.on('end', () => {
            downloaderResponse.end();

            if (range[1] === file.size) {
                this.status = StreamStatus.Finished;
            }

            // Clean up
            streams.delete(this);
        });
    }

    private bindDownloaderEvents(): void {
        const {downloaderRequest} = this;

        downloaderRequest.on('close', () => {
            this.status = StreamStatus.Pending;
            this.provider.sendMessage('stream-cancelled', this.id);
            streams.delete(this);
        });
    }
}
