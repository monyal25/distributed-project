const { Kafka } = require('kafkajs');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const wss = new WebSocket.Server({ noServer: true });

const kafka = new Kafka({
  clientId: 'weather-alerts-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'weather-alerts-group' });

// Handle WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const run = async () => {
  await consumer.connect();
  console.log('Connected to Kafka consumer');

  // Subscribe to topics
  const topics = ['California-weather-alerts-topic', 'Florida-weather-alerts-topic', 'Washington-weather-alerts-topic'];
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: true });
    console.log(`Subscribed to ${topic}`);
  }

  // Consume messages from Kafka and push to WebSocket clients
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received message from topic: ${topic}`);
      const data = JSON.parse(message.value.toString());

      // Broadcast message to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    },
  });
};

// Setup WebSocket server on the HTTP server
const server = app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

run().catch(console.error);
