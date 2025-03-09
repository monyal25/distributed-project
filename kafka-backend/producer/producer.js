const { Kafka } = require('kafkajs');
const fetch = require('node-fetch');

const kafka = new Kafka({
  clientId: 'weather-alerts',
  brokers: ['kafka:9093'],
});

const producer = kafka.producer();
const OPENWEATHER_API_KEY = '5086ab6ea8934e48c2a4767d7da38687';

// Fetch weather alerts from OpenWeather API
const fetchWeatherAlerts = async (lat, lon) => {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=hourly,daily&appid=${OPENWEATHER_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Weather API response for (${lat}, ${lon}):`, data);

    return data.alerts || [];
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    return [];
  }
};

// Fetch fire-related disasters from FEMA API
const fetchFireDisasters = async (state) => {
  try {
    const response = await fetch(`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?state=${state}&incidentType=Fire`);
    const data = await response.json();
    console.log(`FEMA Fire API response for ${state}:`, data);

    const fireIncidents = data.DisasterDeclarationsSummaries.filter(
      (incident) => incident.incidentType === 'Fire'
    );
    return fireIncidents;
  } catch (error) {
    console.error('Error fetching fire disasters:', error);
    return [];
  }
};

// Fetch all disasters from FEMA API
const fetchDisasters = async (state) => {
  try {
    const response = await fetch(`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?state=${state}`);
    const data = await response.json();
    console.log(`FEMA Disasters API response for ${state}:`, data);

    return data.DisasterDeclarationsSummaries;
  } catch (error) {
    console.error('Error fetching disasters:', error);
    return [];
  }
};

// Send messages to Kafka
const sendToKafka = async (topic, alerts, disasters) => {
  const fireMessages = disasters.map((disaster) => ({
    value: JSON.stringify({
      eventType: disaster.incidentType,
      description: disaster.declarationTitle,
      startDate: disaster.declarationDate,
    }),
  }));

  const weatherMessages = alerts.map((alert) => ({
    value: JSON.stringify({
      event: alert.event,
      description: alert.description,
      start: alert.start,
      end: alert.end,
    }),
  }));

  try {
    await producer.send({
      topic,
      messages: [...weatherMessages, ...fireMessages],
    });

    console.log(`✅ Sent ${weatherMessages.length + fireMessages.length} messages to Kafka topic: ${topic}`);
  } catch (error) {
    console.error('Error sending messages to Kafka:', error);
  }
};

// New function to send a manual alert
const sendWeatherAlert = async (city, alertMessage) => {
  try {
    const topic = `${city}-weather-alerts-topic`;
    await sendToKafka(topic, [{ event: alertMessage }], []);
    console.log(`✅ Sent manual alert for ${city}: ${alertMessage}`);
  } catch (error) {
    console.error('Error sending manual weather alert:', error);
  }
};

// Function to fetch data and publish to Kafka for each state
const fetchDataAndPublish = async () => {
  const stateCoordinates = {
    California: { lat: 36.7783, lon: -119.4179 },
    Florida: { lat: 27.9944024, lon: -81.7602544 },
    Washington: { lat: 47.7511, lon: -120.7401 },
  };

  for (const state in stateCoordinates) {
    console.log(`🌎 Fetching data for ${state}`);
    const { lat, lon } = stateCoordinates[state];

    const alerts = await fetchWeatherAlerts(lat, lon);
    const fireDisasters = await fetchFireDisasters(state);

    await sendToKafka(`${state}-weather-alerts-topic`, alerts, fireDisasters);
  }
};

// Ensure the Kafka producer connects only once
const startProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Connected to Kafka producer');

    await fetchDataAndPublish();
    setInterval(fetchDataAndPublish, 600000); // Every 10 minutes
  } catch (error) {
    console.error('Error starting producer:', error);
  }
};

startProducer();

module.exports = { sendWeatherAlert };
