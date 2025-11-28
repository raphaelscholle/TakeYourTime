# TakeYourTime

This project uses Vite + React. You can run the dev server locally or expose it on your local network for testing from another device.

## Prerequisites
- Node.js 18+
- npm

Install dependencies once:

```bash
npm install
```

## Run the dev server on the local network

You have two options to start a network-accessible dev server that logs the reachable IP addresses and port.

### Using the Bash helper (recommended on Unix-like systems)

```bash
./scripts/dev-remote.sh
```

- Binds the Vite dev server to `0.0.0.0` so it can be reached from another device on the same network.
- Prints the primary URL plus any additional local IPv4 addresses with the port.
- Respects the `PORT` or `VITE_PORT` environment variables (default: `5173`).

### Using the Node helper script

```bash
npm run dev:remote
```

- Provides the same host/port behavior using Node.js.
- Also lists the detected IPv4 addresses for quick copy/paste.

If no external IPv4 is detected, both scripts will fall back to `localhost`.
