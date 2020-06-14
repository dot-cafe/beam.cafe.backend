import {config} from '../config';

export type ByteRangeHeader = [number, number];

const headerRegexp = /^bytes=(\d+)?-(\d+)?/;

/**
 * Resolves the first part of a range-header, returns null if the request range
 * is not satisfiable
 * @param str Header string
 * @param size File size
 */
export const parseByteRangeHeader = (str: string, size: number): [number, number] | null => {
    const {mediaStreamChunkSize} = config.server;
    const rangeParts = headerRegexp.exec(str);

    // Byte-ranges are zero-inclusive
    size--;

    if (!rangeParts) {
        return [0, size];
    }

    const [, start, end] = rangeParts;
    const numStart = start === undefined ? -1 : Number(start);
    const numEnd = end === undefined ? -1 : Number(end);
    const hasStart = numStart !== -1;
    const hasEnd = numEnd !== -1;

    // Validate range
    if (hasStart && numStart > size ||
        hasEnd && numEnd > size) {
        return null;
    }

    if (!hasStart && !hasEnd) {

        // Return first chunk
        return [0, Math.min(mediaStreamChunkSize, size)];
    } else if (!hasStart && hasEnd) {

        // Last numEnd-bytes
        const offset = size - numEnd;
        const chunkEnd = offset + mediaStreamChunkSize;

        // Return first chunk from offset
        return [offset, Math.min(size, chunkEnd)];
    } else if (hasStart && !hasEnd) {

        // Return chunk after offset
        const chunkEnd = numStart + mediaStreamChunkSize;
        return [numStart, Math.min(size, chunkEnd)];
    }

    // Return chunk after offset
    const chunkEnd = Math.min(numStart + mediaStreamChunkSize, numEnd, size);
    return [numStart, chunkEnd];
};
