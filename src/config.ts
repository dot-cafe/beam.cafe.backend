import deepmerge         from 'deepmerge';
import defaultConfig     from '../config/default.json';
import developmentConfig from '../config/development.json';
import productionConfig  from '../config/production.json';
import {LogLevel}        from './logging';

type Config = {
    server: {
        port: number;
        api: string;
        internalIdSize: number;
        mediaStreamChunkSize: number;
    };

    security: {
        fileKeySize: number;
        streamKeySize: number;
        downloadKeySize: number;
        downloadKeyMaxAge: number;
        clientWebSocketTimeout: number;
        clientWebSocketSessionTimeout: number;
        clientWebSocketSessionKeySize: number;
        transferLimit: number;
        transferLimitResetInterval: number;
    };

    logs: {
        logUserAgent: boolean;
        logLevels: Array<LogLevel>;
    };
}

export const config = deepmerge(
    defaultConfig,
    process.env.NODE_ENV === 'development' ?
        (developmentConfig as Config) :
        (productionConfig as Config),
    {
        arrayMerge(destinationArray, sourceArray) {
            return sourceArray;
        }
    }
) as Config;
