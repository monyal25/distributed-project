const WebSocket = require('ws');
const { sendWeatherAlert } = require('./producer/producer');  // Kafka producer
const { consumeWeatherAlerts } = require('./consumer/consumer');  // Kafka consumer

// CORS settings: allow connections only from specific origin
const allowedOrigins = ['http://localhost:3000']; // Your React app URL

// Create a new WebSocket server on port 3001
const webSocket = new WebSocket.Server({
  port: 5000,
  verifyClient: (info, done) => {
    const origin = info.origin;
    if (allowedOrigins.includes(origin)) {
      done(true);  // Accept connection
    } else {
      console.log('Connection from origin not allowed:', origin);
      done(false);  // Reject connection
    }
  }
});

webSocket.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // Handle the subscription messages from the client
  ws.on('message', (message) => {
    try {
      const { subscribe, location } = JSON.parse(message);
      
      if (subscribe && location) {
        console.log(`User subscribed to: ${location}`);
        
        // Inform the client that they are subscribed
        ws.send(JSON.stringify({ message: `Subscribed to weather alerts for ${location}` }));
        
        // Start consuming weather alerts for the specific location
        consumeWeatherAlerts(location, ws);
      } else {
        console.log('Invalid subscription message received.');
        ws.send(JSON.stringify({ error: 'Invalid subscription message' }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Failed to process message' }));
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

// Simulate sending weather alerts for "LosAngeles" and potentially other locations
setInterval(() => {
  try {
    sendWeatherAlert('LosAngeles', 'Severe weather alert for Los Angeles!');
    // Add other cities based on active subscriptions if needed
  } catch (error) {
    console.error('Error sending weather alert:', error);
  }
}, 5000);  // Send alerts every 5 seconds

console.log('WebSocket server is running on ws://localhost:5000/');
