import { createConnection } from 'net';
import { BeastParser } from './beast-parser.js';
import { EventEmitter } from 'events';

export class BeastConnection extends EventEmitter {
  constructor(host, port, options = {}) {
    super();
    this.host = host;
    this.port = port;
    this.parser = new BeastParser();
    this.socket = null;
    this.connected = false;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.updateInterval = options.updateInterval || 100; // Broadcast every 100ms
    this.broadcastTimer = null;
    this.lastBroadcast = 0;
  }

  connect() {
    if (this.socket) return;

    console.log(`[Beast] Connecting to ${this.host}:${this.port}`);

    this.socket = createConnection({
      host: this.host,
      port: this.port,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log(`[Beast] Connected to ${this.host}:${this.port}`);
      this.connected = true;
      this.emit('connected');
      this.startBroadcastTimer();
    });

    this.socket.on('data', (data) => {
      try {
        const aircraft = this.parser.processData(data);
        // Emit on data received (batched updates)
        this.emit('data', aircraft);
      } catch (err) {
        console.error('[Beast] Parse error:', err);
      }
    });

    this.socket.on('error', (err) => {
      console.error(`[Beast] Connection error: ${err.message}`);
      this.connected = false;
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      console.log(`[Beast] Connection closed, will reconnect in ${this.reconnectInterval}ms`);
      this.connected = false;
      this.stopBroadcastTimer();
      this.socket = null;
      this.emit('closed');

      // Auto-reconnect
      setTimeout(() => this.connect(), this.reconnectInterval);
    });

    this.socket.on('timeout', () => {
      console.error('[Beast] Connection timeout');
      this.socket.destroy();
    });
  }

  startBroadcastTimer() {
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);

    this.broadcastTimer = setInterval(() => {
      const aircraft = Array.from(this.parser.aircraft.values());
      if (aircraft.length > 0) {
        this.emit('broadcast', {
          timestamp: Date.now(),
          aircraft: aircraft,
        });
      }
    }, this.updateInterval);
  }

  stopBroadcastTimer() {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
  }

  disconnect() {
    this.stopBroadcastTimer();
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }

  getAircraft() {
    return Array.from(this.parser.aircraft.values());
  }

  clearOldAircraft(maxAge = 300000) {
    // Remove aircraft not updated in last 5 minutes
    const now = Date.now();
    for (const [hex, aircraft] of this.parser.aircraft.entries()) {
      if (now - aircraft.timestamp > maxAge) {
        this.parser.aircraft.delete(hex);
      }
    }
  }
}
