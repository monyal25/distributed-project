const WebSocket = require("ws");
const { sendWeatherAlert } = require("../producer/producer"); // Kafka producer
const { consumeWeatherAlerts } = require("../consumer/consumer"); // Kafka consumer

// Allowed origins for WebSocket connections
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

const webSocket = new WebSocket.Server({
  host: "0.0.0.0",
  port: 5000,
  verifyClient: (info, done) => {
    const origin = info.origin || "";
    if (!origin || allowedOrigins.includes(origin)) {
      done(true); // Accept connection
    } else {
      console.log("Connection from origin not allowed:", origin);
      done(false); // Reject connection
    }
  },
});

const clients = new Map(); // Store active client subscriptions

webSocket.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    try {
      const { subscribe, location } = JSON.parse(message);

      if (subscribe && location) {
        console.log(`User subscribed to: ${location}`);

        // Store subscription details
        if (!clients.has(location)) {
          clients.set(location, new Set());
        }
        clients.get(location).add(ws);

        ws.send(JSON.stringify({ message: `Subscribed to weather alerts for ${location}` }));

        // Start consuming weather alerts for this location
        consumeWeatherAlerts(location, (alertMessage) => {
          sendToSubscribers(location, alertMessage);
        });
      } else {
        console.log("Invalid subscription message received.");
        ws.send(JSON.stringify({ error: "Invalid subscription message" }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({ error: "Failed to process message" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    removeClient(ws);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    removeClient(ws);
  });
});

// Function to send messages only to active subscribers
const sendToSubscribers = (location, message) => {
  if (clients.has(location)) {
    clients.get(location).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // ✅ Forward the Kafka message **without altering the structure**
        client.send(JSON.stringify({
          location: location,
          message: {
            eventType: message.eventType || "Unknown",
            description: message.description || "No description available.",
            startDate: message.startDate || "N/A",
            url: message.url || "#"
          }
        }));
      }
    });
  }
};


// Function to remove a disconnected client
const removeClient = (ws) => {
  clients.forEach((subscribers, location) => {
    if (subscribers.has(ws)) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        clients.delete(location);
      }
    }
  });
};

// Simulate sending weather alerts (only if someone is subscribed)
setInterval(() => {
  clients.forEach((subscribers, location) => {
    if (subscribers.size > 0) {
      sendWeatherAlert(location, `Severe weather alert for ${location}!`);
    }
  });
}, 5000);

console.log("WebSocket server is running on ws://localhost:5000/");
