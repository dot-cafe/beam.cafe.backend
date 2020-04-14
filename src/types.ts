import {Request, Response} from 'express';
import * as WebSocket      from 'ws';

/**
 * A hosted file with name, size
 * and the download-key.
 */
export type HostedFile = {
    name: string;
    size: number;
    key: string;
};

/**
 * A client / file-provider.
 */
export type Client = {

    // Corresponding websocket
    socket: WebSocket;

    // List of files available
    files: Array<HostedFile>;
};

/**
 * A currently pending download.
 */
export type PendingDownload = {
    downloadId: string;

    // Amount of bytes transferred
    bytesTransferred: number;

    // The uploader / source
    fileProvider: Client;

    // The uploader's request and response
    uploaderResponse: Response | null;
    uploaderRequest: Request | null;

    // The downloader's response
    downloaderResponse: Response;

    // The file
    file: HostedFile;

    // If headers has been send
    headersSent: boolean;
};
