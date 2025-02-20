const { Kafka } = require('kafkajs');
const fetch = require('node-fetch');

const kafka = new Kafka({
  clientId: 'weather-alerts',
  brokers: ['localhost:9092'], // Change to your Kafka brokers
});

const producer = kafka.producer();

// Fetch weather alerts from OpenWeather API for a given state
const fetchWeatherAlerts = async (lat, lon) => {
  //const apiKey = 'YOUR_OPENWEATHER_API_KEY'; // Replace with your OpenWeather key
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=hourly,daily`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.alerts) {
    return data.alerts;
  }
  return [];
};

// Fetch fire-related disaster from FEMA API
const fetchFireDisasters = async (state) => {
  const response = await fetch(`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?state=${state}&incidentType=Fire`);
  const data = await response.json();
  const fireIncidents = data.incidents.filter(incident => incident.eventType === 'Fire');
  return fireIncidents;
};

// Fetch disaster details from FEMA API
const fetchDisasters = async (state) => {
  const response = await fetch(`https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?state=${state}`);
  const data = await response.json();
  return data.incidents;
};

// Send messages to Kafka
const sendToKafka = async (topic, alerts, disasters) => {
  const fireMessages = disasters.map((disaster) => ({
    value: JSON.stringify({
      eventType: disaster.eventType,
      description: disaster.incidentType,
      startDate: disaster.declaredDate,
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

  await producer.connect();
  console.log('Connected to Kafka producer');

  // Send weather and fire data to Kafka
  await producer.send({
    topic: topic,
    messages: [...weatherMessages, ...fireMessages],
  });

  console.log(`Sent ${weatherMessages.length + fireMessages.length} messages to Kafka on topic: ${topic}`);
};

// Function to fetch data and publish to Kafka for each state
const fetchDataAndPublish = async () => {
  const stateCoordinates = {
    California: { lat: 36.7783, lon: -119.4179 },
    Florida: { lat: 27.9944024, lon: -81.7602544 },
    Washington: { lat: 47.7511, lon: -120.7401 },
  };

  for (const state in stateCoordinates) {
    console.log(`Fetching data for ${state}`);
    const alerts = await fetchWeatherAlerts(stateCoordinates[state].lat, stateCoordinates[state].lon);
    const fireDisasters = await fetchFireDisasters(state);
    const disasters = await fetchDisasters(state);
    
    await sendToKafka(`${state}-weather-alerts-topic`, alerts, fireDisasters);
  }
};

setInterval(fetchDataAndPublish, 600000); // Fetch and send every 10 minutes
