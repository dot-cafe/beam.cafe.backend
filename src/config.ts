import deepmerge         from 'deepmerge';
import defaultConfig     from '../config/default.json';
import developmentConfig from '../config/development.json';
import productionConfig  from '../config/production.json';
import {LogLevel}        from './logging';

type Config = {
    server: {
        port: number;
        api: string;
    };

    security: {
        downloadKeySize: number;
        downloadKeyMaxAge: number;
        clientWebSocketConnectionTimeout: number;
        clientWebSocketSessionKeySize: number;
    };

    logs: {
        logUserAgent: boolean;
        logLevels: Array<LogLevel>;
    };
}

export const config = deepmerge(
    defaultConfig,
    process.env.NODE_ENV === 'development' ?
        developmentConfig :
        productionConfig,
    {
        arrayMerge(destinationArray, sourceArray) {
            return sourceArray;
        }
    }
) as Config;
