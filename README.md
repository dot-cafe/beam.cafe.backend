<h3 align="center">
    <img src="https://user-images.githubusercontent.com/30767528/80746783-b892d180-8b22-11ea-987a-34624c23ee65.png" alt="Logo" height="400">
</h3>

<h3 align="center">
    Beam up something. Instantly. Anonymously.
</h3>

<br/>

<p align="center">
  <a href="https://github.com/dot-cafe/beam.cafe.backend/actions?query=workflow%3ADeploy"><img
     alt="CD Status"
     src="https://github.com/dot-cafe/beam.cafe.backend/workflows/Deploy/badge.svg"/></a>
  <a href="https://github.com/dot-cafe/beam.cafe.backend/actions?query=workflow%3ACI"><img
     alt="CI Status"
     src="https://github.com/dot-cafe/beam.cafe.backend/workflows/CI/badge.svg"/></a>
  <img alt="Current version"
       src="https://img.shields.io/github/tag/dot-cafe/beam.cafe.backend.svg?color=0A8CFF&label=version">
  <a href="https://github.com/sponsors/Simonwep"><img
     alt="Support me"
     src="https://img.shields.io/badge/github-support-3498DB.svg"></a>
</p>

---

<p align="center">
This is the official backend for <a href="https://beam.cafe">beam.cafe</a>, check out the <a href="https://github.com/dot-cafe/beam.cafe">main repository</a>!
</p>

---

### Configuration:
The configuration consists of three files, the [default.json](config/default.json) with default values, a [development.json](config/development.json) with development-specific values and a [production.json](config/production.json) version.

A config file consists of the following options, each option is optional and will be merged with the default configuration.

```json5
{
    "server": {
        "port": 8080,
        "internalIdSize": 32, // Size of ids used in internal in-memory objects
        "mediaStreamChunkSize": 4096000 // Maximum size of a chunk used in streaming
    },
    "security": {
        "fileKeySize": 8, // File-key size, used as part of the download-link - the longer the better
        "streamKeySize": 64, // Access-key size for streams - the longer the better
        "downloadKeySize": 64, // Access-key size for downloads - the longer the better
        "downloadKeyMaxAge": 60000, // Maximum age of a download key until its used - the shorter the better
        "clientWebSocketTimeout": 15000, // Timout for a websocket without a session - the shorter the better
        "clientWebSocketSessionTimeout": 900000, // Timeout for web-socket connections
        "clientWebSocketSessionKeySize": 64, // Size of a session-key - the longer the better
        "transferLimit": 50000000000, // Transferlimit for the uploader (ip-based) - used to prevent abuse (50GB)
        "transferLimitResetInterval": 86400000 // Expiration date for the transfer-limit (1d)
    },
    "logs": {
        "logUserAgent": true, // If the user-agent of each client should be logged
        "logLevels": [ // Log-level filter
            "FATAL",
            "ERROR",
            "WARNING",
            "INFO",
            "DEBUG"
        ]
    }
}

```

Logs are saved in `./.logs` relative to the location of where the application got launched.
