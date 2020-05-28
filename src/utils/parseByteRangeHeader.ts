import {config} from '../config';

export type ByteRangeHeader = [number, number];

const headerRegexp = /^bytes=(\d+)?-(\d+)?/;
export const parseByteRangeHeader = (str: string, size: number): [number, number] => {
    const {mediaStreamChunkSize} = config.server;
    const rangeParts = headerRegexp.exec(str);

    if (!rangeParts) {
        return [0, size];
    }

    const [, start, end] = rangeParts;
    const numStart = start === undefined ? -1 : Number(start);
    const numEnd = end === undefined ? -1 : Number(end);
    const hasStart = numStart !== -1;
    const hasEnd = numEnd !== -1;

    if (!hasStart && !hasEnd) {

        // Return first chunk
        return [0, Math.min(mediaStreamChunkSize, size)];
    } else if (!hasStart && hasEnd) {

        // Last numEnd-bytes
        const offset = Math.max(0, size - numEnd);
        const chunkEnd = offset + mediaStreamChunkSize;

        // Return first chunk from offset
        return [offset, Math.min(size, chunkEnd)];
    } else if (hasStart && !hasEnd) {

        // Return chunk after offset
        const offset = Math.min(size, numStart);
        const chunkEnd = offset + mediaStreamChunkSize;
        return [offset, Math.min(size, chunkEnd)];
    }

    // Return chunk after offset
    const offset = Math.min(size, numStart);
    const chunkEnd = offset + mediaStreamChunkSize;
    return [offset, Math.min(numEnd, chunkEnd)];

};
