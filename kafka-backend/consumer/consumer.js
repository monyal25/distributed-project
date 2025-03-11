const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "weather-alerts-consumer",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "weather-alerts-group" });

// ✅ Function for WebSocket to Call When a User Subscribes
const consumeWeatherAlerts = async (location, callback) => {
  try {
    await consumer.connect();
    console.log(`✅ Connected to Kafka Consumer for ${location}`);

    const topic = `${location}-weather-alerts-topic`;

    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`📩 Subscribed to topic: ${topic}`);

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`🔔 Received message from ${topic}:`, data);

          // ✅ Send message to WebSocket callback
          callback(data);
        } catch (err) {
          console.error("❌ Error processing Kafka message:", err);
        }
      },
    });
  } catch (error) {
    console.error("❌ Error starting Kafka consumer:", error);
  }
};

// ✅ Export the function so `websocket.js` can use it
module.exports = { consumeWeatherAlerts };
