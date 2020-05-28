import {config} from '../config';

export type ByteRangeHeader = [number, number];

const headerRegexp = /^bytes=(\d+)(-(\d)+)?/;
export const parseByteRangeHeader = (str: string, size: number): [number, number] => {
    const {mediaStreamChunkSize} = config.server;
    const rangeParts = headerRegexp.exec(str);

    if (!rangeParts) {
        return [0, size];
    }

    const [, start, , end] = rangeParts;
    const numStart = Number(start);
    const numEnd = end === undefined ? size : Number(end);

    if (Number.isNaN(numStart) || Number.isNaN(numEnd)) {
        return [0, size];
    }

    const chunkEnd = numStart + mediaStreamChunkSize;
    return [numStart, Math.min(chunkEnd, size)];
};
