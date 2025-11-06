// server.js
import { BeastConnection } from './src/beast-connection.js';
import { AircraftWebSocketServer } from './src/websocket-server.js';
import { FINAL_CONFIG } from './config.js';

class BeastWebSocketBridge {
  constructor(config) {
    this.config = config;
    this.beastConnections = [];
    this.wsServer = null;
    this.cleanupTimer = null;
  }

  start() {
    console.log('🚀 Starting Beast WebSocket Bridge');
    console.log(`📡 WebSocket server on port ${this.config.webSocketPort}`);

    // Start WebSocket server
    this.wsServer = new AircraftWebSocketServer(
      this.config.webSocketPort,
      { maxClients: this.config.maxClients }
    );

    this.wsServer.on('client-connected', (count) => {
      if (this.config.verbose) {
        console.log(`👥 Clients connected: ${count}`);
      }
    });

    this.wsServer.on('client-disconnected', (count) => {
      if (this.config.verbose) {
        console.log(`👥 Clients connected: ${count}`);
      }
    });

    // Start Beast connections
    const enabledSources = this.config.beastSources.filter(s => s.enabled !== false);

    if (enabledSources.length === 0) {
      console.warn('⚠️  No Beast sources enabled in config');
    }

    for (const source of enabledSources) {
      this.connectBeastSource(source);
    }

    // Periodic cleanup of old aircraft
    this.cleanupTimer = setInterval(() => {
      for (const conn of this.beastConnections) {
        const before = conn.parser.aircraft.size;
        conn.clearOldAircraft(this.config.aircraftMaxAge);
        const after = conn.parser.aircraft.size;
        if (before !== after && this.config.verbose) {
          console.log(
            `🧹 Cleanup: ${conn.host}:${conn.port} ${before} → ${after} aircraft`
          );
        }
      }
    }, 30000); // Every 30 seconds

    console.log('✅ Beast WebSocket Bridge started');
  }

  connectBeastSource(sourceConfig) {
    console.log(`🔗 Connecting to Beast: ${sourceConfig.name} (${sourceConfig.host}:${sourceConfig.port})`);

    const conn = new BeastConnection(sourceConfig.host, sourceConfig.port, {
      reconnectInterval: this.config.reconnectInterval,
      updateInterval: this.config.aircraftUpdateInterval,
    });

    this.beastConnections.push(conn);

    conn.on('connected', () => {
      console.log(`✅ Connected: ${sourceConfig.name}`);
    });

    conn.on('data', (aircraft) => {
      // Update WebSocket with latest aircraft
      const allAircraft = this.getAllAircraft();
      this.wsServer.updateAircraft(allAircraft);
    });

    conn.on('error', (err) => {
      console.error(`❌ Error from ${sourceConfig.name}: ${err.message}`);
    });

    conn.on('closed', () => {
      console.log(`⚠️  Disconnected: ${sourceConfig.name} (will auto-reconnect)`);
    });

    conn.connect();
  }

  getAllAircraft() {
    const aircraftMap = new Map();

    // Aggregate from all Beast sources
    for (const conn of this.beastConnections) {
      for (const aircraft of conn.getAircraft()) {
        const hex = aircraft.hex;
        const existing = aircraftMap.get(hex) || {};
        // Merge data (later sources override)
        aircraftMap.set(hex, { ...existing, ...aircraft });
      }
    }

    return Array.from(aircraftMap.values());
  }

  getStatus() {
    const beastStatus = this.beastConnections.map(conn => ({
      source: `${conn.host}:${conn.port}`,
      connected: conn.isConnected(),
      aircraft: conn.getAircraft().length,
    }));

    return {
      wsServer: this.wsServer?.getStatus(),
      beastSources: beastStatus,
      totalAircraft: this.getAllAircraft().length,
    };
  }

  stop() {
    console.log('🛑 Stopping Beast WebSocket Bridge');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    for (const conn of this.beastConnections) {
      conn.disconnect();
    }

    if (this.wsServer) {
      this.wsServer.stop();
    }

    console.log('✅ Bridge stopped');
  }
}

// Start server
const bridge = new BeastWebSocketBridge(FINAL_CONFIG);
bridge.start();

// Graceful shutdown
process.on('SIGINT', () => {
  bridge.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bridge.stop();
  process.exit(0);
});

// Status updates
if (FINAL_CONFIG.verbose) {
  setInterval(() => {
    const status = bridge.getStatus();
    console.log(`📊 Status: ${status.totalAircraft} aircraft, ${status.wsServer.clients} clients`);
  }, 60000);
}

export default bridge;
