type Error = {reason: string};

/* ===== API EVENTS ===== */
type InvalidPayload = {location: 'settings' | 'ws'} | {
    location: 'ws-request' | 'ws-action';
    action: string;
};

/* ===== USER EVENTS ===== */
type SessionEvent = {userId: string};
type SessionEventFailed = Error & {userId: string};
type TransferEvent = SessionEvent & {downloadId: string; fileId: string};
type TransferEventFailed = SessionEventFailed & {downloadId: string; fileId: string};
type CreateSession = SessionEvent & {userAgent: string}

type StreamData = {streamKey: string; streamId: string};
type StreamEvent = SessionEvent & StreamData & {fileId: string};
type StreamEventFailed = SessionEventFailed & StreamData & {fileId: string};

/* ===== UPLOAD / STREAM EVENTS ===== */
type UploadTransferEventFailed = Error & {downloadId: string};
type UploadStreamEventFailed = Error & {streamId: string};


/* ===== SYSTEM EVENTS ===== */
export type BootEvent = {message: string};
export type ProcessExit = Error & {cause: string};

export type Events = {
    'booting': BootEvent;
    'process-exit': ProcessExit;
    'invalid-payload': InvalidPayload;
    'create-session': CreateSession;
    'create-session-failed': SessionEventFailed;
    'destroy-session': SessionEvent;
    'restore-session': SessionEvent;
    'restore-session-failed': SessionEventFailed;
    'request-upload': TransferEvent;
    'request-upload-failed': TransferEventFailed;
    'remove-file': SessionEvent;
    'remove-file-failed': SessionEventFailed;
    'accept-upload-failed': UploadTransferEventFailed;
    'cancel-upload-failed': UploadTransferEventFailed;
    'accept-stream-failed': UploadStreamEventFailed;
    'request-stream': StreamEvent;
    'request-stream-failed': StreamEventFailed;
}
