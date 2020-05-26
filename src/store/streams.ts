import {Request, Response} from 'express';
import {config}            from '../config';
import {uid}               from '../utils/uid';
import {Stream}            from './Stream';

export const streams = new class extends Set<Stream> {
    private readonly streamKeys: Map<string, string> = new Map();

    public createStreamKey(fileid: string): string {
        const id = uid(config.security.downloadKeySize); // TODO: Extra key field

        this.streamKeys.set(id, fileid);
        return id;
    }

    public checkStreamKey(key: string): boolean {
        return this.streamKeys.has(key);
    }

    public byId(id: string): Stream | null {
        for (const item of this) {
            if (item.id === id) {
                return item;
            }
        }

        return null;
    }

    public acceptTransfer(
        uploaderRequest: Request,
        uploaderResponse: Response,
        streamId: string
    ): boolean {
        const stream = this.byId(streamId);

        // TODO:
        // if (!stream) {
        //     log('accept-upload-failed', {
        //         reason: 'Download not found.',
        //         streamId
        //     }, LogLevel.INFO);
        //     return false;
        // } else if (stream.status !== TransmissionStatus.Pending) {
        //     log('accept-upload-failed', {
        //         reason: 'Upload already active.',
        //         streamId
        //     }, LogLevel.INFO);
        //     return false;
        // }

        if (!stream) {
            return false;
        }

        stream.accept(uploaderRequest, uploaderResponse);
        return true;
    }
};
