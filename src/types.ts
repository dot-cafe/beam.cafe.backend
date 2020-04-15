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

/**
 * A currently pending download.
 */
export type Download = {
    downloadId: string;

    // Download status
    status: DownloadStatus;

    // Amount of bytes transferred
    bytesTransferred: number;

    // The uploader / source
    fileProvider: Client;

    // The uploader's request and response
    uRes: Response | null;
    uReq: Request | null;

    // The downloader's response
    dRes: Response;

    // The file
    file: HostedFile;

    // If headers has been send
    headersSent: boolean;
};
