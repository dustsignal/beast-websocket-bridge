# Beast WebSocket Bridge

WebSocket bridge server for ADS-B Beast protocol data.

## Installation

```bash
npm install
```

## Configuration

Create `config-local.js`:

```javascript
export const CONFIG = {
  webSocketPort: 8765,           // Browser clients connect here
  beastSources: [
    {
      host: 'localhost', // Local host or IP
      port: 30005,
      name: 'beast source'
    }
  ],
  reconnectInterval: 5000,       // Reconnect to Beast source after failure
  maxClients: 50
};
```

## Running

```bash
npm start
```

## Protocol

Broadcasts JSON aircraft data to connected WebSocket clients every 100ms.

