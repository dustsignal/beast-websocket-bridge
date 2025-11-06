import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

export class AircraftWebSocketServer extends EventEmitter {
  constructor(port, options = {}) {
    super();
    this.port = port;
    this.wss = new WebSocketServer({ port });
    this.clients = new Set();
    this.currentAircraft = [];
    this.maxClients = options.maxClients || 50;
    this.messageQueue = [];
    this.broadcastInterval = options.broadcastInterval || 100;
    this.broadcastTimer = null;

    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws) => {
      console.log(`[WebSocket] New client connected (${this.clients.size + 1} total)`);

      if (this.clients.size >= this.maxClients) {
        ws.close(1008, 'Server at max capacity');
        return;
      }

      this.clients.add(ws);
      this.emit('client-connected', this.clients.size);

      // Send initial state
      ws.send(
        JSON.stringify({
          type: 'init',
          aircraft: this.currentAircraft,
          timestamp: Date.now(),
        })
      );

      ws.on('message', (message) => {
        try {
          const msg = JSON.parse(message);
          this.handleClientMessage(ws, msg);
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err);
        }
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err.message);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected (${this.clients.size} remaining)`);
        this.emit('client-disconnected', this.clients.size);
      });
    });

    console.log(`[WebSocket] Server listening on port ${this.port}`);
  }

  handleClientMessage(ws, msg) {
    // Handle ping/pong
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
    // Handle status requests
    else if (msg.type === 'status') {
      ws.send(
        JSON.stringify({
          type: 'status',
          aircraftCount: this.currentAircraft.length,
          clientCount: this.clients.size,
        })
      );
    }
  }

  updateAircraft(aircraft) {
    this.currentAircraft = aircraft;
    this.broadcast();
  }

  broadcast() {
    if (this.clients.size === 0) return;

    const message = JSON.stringify({
      type: 'update',
      aircraft: this.currentAircraft,
      timestamp: Date.now(),
    });

    const deadClients = [];
    for (const client of this.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(message, (err) => {
          if (err) {
            console.error('[WebSocket] Send error:', err);
            deadClients.push(client);
          }
        });
      } else {
        deadClients.push(client);
      }
    }

    // Clean up dead connections
    deadClients.forEach((client) => this.clients.delete(client));
  }

  start() {
    // Server is already listening after setupServer
  }

  stop() {
    for (const client of this.clients) {
      client.close();
    }
    this.wss.close();
  }

  getStatus() {
    return {
      port: this.port,
      clients: this.clients.size,
      aircraft: this.currentAircraft.length,
      maxClients: this.maxClients,
    };
  }
}
