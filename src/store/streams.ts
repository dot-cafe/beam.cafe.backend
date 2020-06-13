import {Request, Response}    from 'express';
import {config}               from '../config';
import {log, LogLevel}        from '../logging';
import {Collection}           from '../utils/db/Collection';
import {secureUid}            from '../utils/uid';
import {Client}               from './Client';
import {Stream, StreamStatus} from './Stream';

export const streams = new class extends Collection<Stream> {
    private readonly streamKeys: Map<string, string> = new Map();

    public async createStreamKey(fileid: string): Promise<string> {
        const id = await secureUid(config.security.streamKeySize);
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
        return super.filter(value => value.provider === client);
    }

    public acceptTransfer(
        uploaderRequest: Request,
        uploaderResponse: Response,
        streamId: string
    ): 1 | 0 | -1 {
        const stream = super.findItemById(streamId);

        if (!stream) {

            // It's ok. The peer cancelled the stream before it was processed.
            return -1;
        } else if (stream.status !== StreamStatus.Pending) {
            log('accept-stream-failed', {
                reason: 'Stream already active.',
                streamId
            }, LogLevel.WARNING);
            return 0;
        }

        stream.accept(uploaderRequest, uploaderResponse);
        return 1;
    }
};
