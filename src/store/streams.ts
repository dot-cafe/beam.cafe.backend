import {Request, Response}    from 'express';
import {config}               from '../config';
import {log, LogLevel}        from '../logging';
import {uid}                  from '../utils/uid';
import {Stream, StreamStatus} from './Stream';

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

        if (!stream) {
            log('accept-stream-failed', {
                reason: 'Stream not found.',
                streamId
            }, LogLevel.INFO);
            return false;
        } else if (stream.status !== StreamStatus.Pending) {
            log('accept-stream-failed', {
                reason: 'Stream already active.',
                streamId
            }, LogLevel.INFO); // TODO: That's an error
            return false;
        }

        stream.accept(uploaderRequest, uploaderResponse);
        return true;
    }
};
