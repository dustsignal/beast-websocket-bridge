@echo off

:: Beast WebSocket Bridge Installer

:: --- Main ---

echo --- Beast WebSocket Bridge Installer ---

:: Prompt for configuration
set /p ws_port="Enter WebSocket port (default: 8765): "
if not defined ws_port set ws_port=8765

set /p beast_host="Enter Beast source host (default: localhost): "
if not defined beast_host set beast_host=localhost

set /p beast_port="Enter Beast source port (default: 30005): "
if not defined beast_port set beast_port=30005

:: Create config-local.js
echo.
echo --- Creating config-local.js ---
(
    echo export const CONFIG = {
    echo   webSocketPort: %ws_port%,
    echo   beastSources: [
    echo     {
    echo       host: '%beast_host%',
    echo       port: %beast_port%,
    echo       name: 'Local dump1090-fa'
    echo     }
    echo   ],
    echo   reconnectInterval: 5000,
    echo   maxClients: 50
    echo };
) > config-local.js

echo config-local.js created successfully.

:: Install dependencies
echo.
echo --- Installing dependencies (npm install) ---
npm install

echo.
echo --- Installation complete! ---
echo To start the server, run: npm start
