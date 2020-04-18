import * as fs       from 'fs';
import {WriteStream} from 'fs';
import * as path     from 'path';

const LOG_DIRECTORY = path.resolve('./.logs');
const CENTRALIZED_LOGS = path.join(LOG_DIRECTORY, 'all.log');
if (!fs.existsSync(LOG_DIRECTORY)) {
    fs.mkdirSync(LOG_DIRECTORY, {recursive: true});
}

export enum LogLevel {
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    INFO = 'INFO',
    VERBOSE = 'VERBOSE',
    DEBUG = 'DEBUG',
    SILLY = 'SILLY'
}

const logStreams = new Map<LogLevel, WriteStream>();
const all = fs.createWriteStream(CENTRALIZED_LOGS);

for (const [level] of Object.entries(LogLevel)) {
    const logFile = path.resolve(LOG_DIRECTORY, `${level.toLowerCase()}.log`);
    const stream = fs.createWriteStream(logFile);
    logStreams.set(level as LogLevel, stream);
}

export const log = (
    msg: string,
    level = LogLevel.SILLY
): void => {
    const date = (new Date()).toLocaleString();
    const logString = `[${level}] (${date}): ${msg}\n`;
    const logger = logStreams.get(level) as WriteStream;
    logger.write(logString);
    all.write(logString);

    if (process.env.NODE_ENV === 'development') {
        process.stdout.write(logString);
    }
};

const handleForcedExit = (type: string, extra: unknown): void => {
    let additionalInformation = '';

    if (extra instanceof Error) {
        additionalInformation = `\n${extra.stack}`;
    } else if (extra !== undefined) {
        additionalInformation = `\n${extra}`;
    }

    log(`Process exit: ${type + additionalInformation}`, LogLevel.ERROR);
};

process.on('exit', handleForcedExit.bind(null, 'exit'));
process.on('SIGINT', handleForcedExit.bind(null, 'SIGINT'));
process.on('uncaughtException', handleForcedExit.bind(null, 'uncaughtException'));
