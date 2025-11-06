// config.js
export const CONFIG = {
  // WebSocket server
  webSocketPort: 8765,
  maxClients: 50,

  // Beast data sources
  beastSources: [
    {
      name: 'Primary Receiver',
      host: 'localhost',
      port: 30005,
      enabled: true,
    },
    // {
    //   name: 'Secondary Receiver',
    //   host: '192.168.1.100',
    //   port: 30005,
    //   enabled: false,
    // }
  ],

  // Connection settings
  reconnectInterval: 5000,
  aircraftUpdateInterval: 100, // Broadcast every 100ms
  aircraftMaxAge: 300000, // Remove aircraft not seen for 5 min

  // Logging
  verbose: true,
};

// Allow local config override
let localConfig = {};
try {
  const imported = await import('./config-local.js');
  localConfig = imported.CONFIG || {};
} catch (err) {
  // config-local.js doesn't exist, use defaults
}

export const FINAL_CONFIG = {
  ...CONFIG,
  ...localConfig,
};
