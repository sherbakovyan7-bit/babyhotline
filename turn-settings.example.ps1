# Copy to turn-settings.local.ps1. Fill with credentials from your TURN provider.
$env:TURN_URL='turns:YOUR-TURN-HOST:5349?transport=tcp'
$env:TURN_USERNAME='YOUR-USERNAME'
$env:TURN_PASSWORD='YOUR-PASSWORD'
$env:PUBLIC_ORIGIN='https://YOUR-VOICE-SERVER'
$env:HOST='127.0.0.1'
$env:PORT='3001'
node server.mjs
