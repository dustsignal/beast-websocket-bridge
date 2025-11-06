#!/bin/bash

# Beast WebSocket Bridge Installer

# --- Functions ---

echo_color() {
    echo -e "\033[1;36m$1\033[0m"
}

# --- Main ---

echo_color "--- Beast WebSocket Bridge Installer ---"

# Prompt for configuration
read -p "Enter WebSocket port (default: 8765): " ws_port
ws_port=${ws_port:-8765}

read -p "Enter Beast source host (default: localhost): " beast_host
beast_host=${beast_host:-localhost}

read -p "Enter Beast source port (default: 30005): " beast_port
beast_port=${beast_port:-30005}

# Create config-local.js
echo_color "\n--- Creating config-local.js ---"
cat > config-local.js << EOL
export const CONFIG = {
  webSocketPort: ${ws_port},
  beastSources: [
    {
      host: '${beast_host}',
      port: ${beast_port},
      name: 'Local dump1090-fa'
    }
  ],
  reconnectInterval: 5000,
  maxClients: 50
};
EOL

echo "config-local.js created successfully."

# Install dependencies
echo_color "\n--- Installing dependencies (npm install) ---"
npm install

echo_color "\n--- Installation complete! ---"
echo "To start the server, run: npm start"
