import {Request, Response}    from 'express';
import {config}               from '../config';
import {log, LogLevel}        from '../logging';
import {Collection}           from '../utils/db/Collection';
import {uid}                  from '../utils/uid';
import {Client}               from './Client';
import {Stream, StreamStatus} from './Stream';

export const streams = new class extends Collection<Stream> {
    private readonly streamKeys: Map<string, string> = new Map();

    public createStreamKey(fileid: string): string {
        const id = uid(config.security.streamKeySize);
        this.streamKeys.set(id, fileid);

        return id;
    }

    public checkStreamKey(key: string): boolean {
        return this.streamKeys.has(key);
    }

    public removeStreamKey(key: string): boolean {
        return this.streamKeys.delete(key);
    }

    public byClient(client: Client): Array<Stream> {
        return this.filter(value => value.provider === client);
    }

    public acceptTransfer(
        uploaderRequest: Request,
        uploaderResponse: Response,
        streamId: string
    ): boolean {
        const stream = this.findItemById(streamId);

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
