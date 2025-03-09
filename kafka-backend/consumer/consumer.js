const { Kafka } = require('kafkajs');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const PORT = 3001;

const kafka = new Kafka({
  clientId: 'weather-alerts-consumer',
  brokers: ['kafka:9093'],
});

const consumer = kafka.consumer({ groupId: 'weather-alerts-group' });

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
  });
});

// Start Kafka consumer and handle messages
const startConsumer = async () => {
  try {
    await consumer.connect();
    console.log('✅ Connected to Kafka');

    const topics = [
      'California-weather-alerts-topic',
      'Florida-weather-alerts-topic',
      'Washington-weather-alerts-topic',
    ];

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
      console.log(`📩 Subscribed to topic: ${topic}`);
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`🔔 Message from ${topic}:`, data);

          // Broadcast to all connected WebSocket clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ topic, data }));
            }
          });
        } catch (err) {
          console.error('❌ Error processing message:', err);
        }
      },
    });
  } catch (err) {
    console.error('❌ Error starting Kafka consumer:', err);
  }
};

// Setup HTTP server for WebSocket upgrade
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Start the consumer
startConsumer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down...');
  await consumer.disconnect();
  server.close(() => {
    console.log('🛑 Server closed');
    process.exit(0);
  });
});
