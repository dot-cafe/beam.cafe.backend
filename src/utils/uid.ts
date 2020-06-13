import {randomBytes} from 'crypto';
import {promisify}   from 'util';

const randomBytesAsync = promisify(randomBytes);

export const uid = (length: number): string => {
    let str = Date.now().toString(32);

    while (str.length < length) {
        const salt = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
        str += salt.slice(str.length - length);
    }

    return str;
};

export const secureUid = async (length: number): Promise<string> => {
    if (length < 8) {
        throw new Error('Minimum length for an uid is 8.');
    }

    let str = '';
    while (str.length < length) {
        const next = await randomBytesAsync((length * 1.5) >>> 0);

        if (next === undefined) {
            return uid(length);
        }

        str += next
            .toString('base64')
            .replace(/[+=\/]/g, '');
    }

    return str.substr(0, length);
};
