
const WebSocket = require('ws');
const { sendWeatherAlert } = require('./producer');  // Kafka producer
const { consumeWeatherAlerts } = require('./consumer');  // Kafka consumer

// Create a WebSocket server listening on port 3001
const wsServer = new WebSocket.Server({ port: 3001 });

wsServer.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const { subscribe, location } = JSON.parse(message);
      if (subscribe) {
        console.log(`User subscribed to: ${location}`);
        // Start consuming weather alerts for the specific location
        consumeWeatherAlerts(location, ws);
      } else {
        console.log('Invalid subscription message received.');
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Simulate sending weather alerts for a location (e.g., "LosAngeles")
setInterval(() => {
  sendWeatherAlert('LosAngeles', 'Severe weather alert for Los Angeles!');
}, 5000);  // Send alerts every 5 seconds

console.log('WebSocket server is running on ws://localhost:3001/');
