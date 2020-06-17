import * as fs       from 'fs';
import {WriteStream} from 'fs';
import * as path     from 'path';
import {config}      from '../config';
import {uid}         from '../utils/uid';
import {Events}      from './events';

const LOG_FILE_STREAM_OPTIONS = {flags: 'a'};
const LOG_DIRECTORY = path.resolve('./.logs');
const CENTRALIZED_LOGS = path.join(LOG_DIRECTORY, 'all.json');
if (!fs.existsSync(LOG_DIRECTORY)) {
    fs.mkdirSync(LOG_DIRECTORY, {recursive: true});
}

export enum LogLevel {
    FATAL = 'FATAL',
    ERROR = 'ERROR',
    WARNING = 'WARNING',
    INFO = 'INFO',
    DEBUG = 'DEBUG'
}

const logStreams = new Map<LogLevel, WriteStream>();
const all = fs.createWriteStream(CENTRALIZED_LOGS, LOG_FILE_STREAM_OPTIONS);

// Create log-files and corresponding streams
const logLevels = config.logs.logLevels;
for (const [level] of Object.entries(LogLevel)) {
    if (logLevels.includes(level as LogLevel)) {
        const logFile = path.resolve(LOG_DIRECTORY, `${level.toLowerCase()}.json`);
        const stream = fs.createWriteStream(logFile, LOG_FILE_STREAM_OPTIONS);
        logStreams.set(level as LogLevel, stream);
    }
}

/**
 * Logs something
 * @param t Event-name
 * @param p Event properties
 * @param level Log-level
 */
export const log = <T extends keyof Events>(
    t: T, p: Events[T],
    level: LogLevel
): void => {

    // Skip ignored / invalid levels
    if (!logLevels.includes(level)) {
        return;
    }

    const logMessage = `${JSON.stringify({
        level: level.toLowerCase(),
        timestamp: Date.now(),
        eventId: uid(config.server.internalIdSize),
        eventType: t,
        ...p
    })}\n`;

    const logger = logStreams.get(level) as WriteStream;
    logger.write(logMessage);
    all.write(logMessage);

    if (process.env.NODE_ENV === 'development') {
        let msg = `${t} {`;

        for (const [key, val] of Object.entries(p)) {
            if (key !== 'type') {
                msg += `${key}: "${val}", `;
            }
        }

        process.stdout.write(`${msg.slice(0, -2)}}`);
        process.stdout.write('\n');
    }
};

const handleForcedExit = (type: string, extra: unknown): void => {
    let additionalInformation = '';

    if (extra instanceof Error) {
        additionalInformation = `\n${extra.stack}`;
    } else if (extra !== undefined) {
        additionalInformation = `\n${extra}`;
    }

    log('process-exit', {
        cause: type,
        reason: additionalInformation
    }, LogLevel.FATAL);
};

process.on('exit', handleForcedExit.bind(null, 'exit'));
process.on('SIGINT', handleForcedExit.bind(null, 'SIGINT'));
process.on('uncaughtException', handleForcedExit.bind(null, 'uncaughtException'));
