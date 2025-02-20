import React, { useState, useEffect } from 'react';
import './WeatherAlerts.css';

const WeatherAlerts = () => {
  const [subscribedTopics, setSubscribedTopics] = useState([]);
  const [alert, setAlert] = useState('');
  const [fireNews, setFireNews] = useState([]);
  const [location, setLocation] = useState('California'); // Default location

  const topics = ['California', 'Florida', 'Washington']; // Available topics (States)
  const [ws, setWs] = useState(null);

  useEffect(() => {
    let isMounted = true;  // Add the isMounted flag
    const socket = new WebSocket('ws://localhost:3001');
    setWs(socket);

    socket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received data:', data);
      // Handle different data types (Weather Alerts, Fire News, etc.)
      if (data.event && isMounted) {
        setAlert(data.event);
      } else if (isMounted) {
        setFireNews((prevNews) => [...prevNews, data]);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      isMounted = false;  // Set isMounted to false on cleanup
      socket.close();
    };
}, []);


    const subscribeToTopic = (topic) => {
    if (!subscribedTopics.includes(topic)) {
      setSubscribedTopics((prev) => [...prev, topic]);
      console.log(`Subscribed to ${topic} alerts`);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ subscribe: topic }));
      }
    } else {
      console.log(`Already subscribed to ${topic} alerts`);
    }
  };
  

  return (
    <div className="weather-alerts">
      <h1>Disater News</h1>
      <div className="subscription">
        <h2>Subscribe to location</h2>
        {topics.map((topic) => (
          <button key={topic} onClick={() => subscribeToTopic(topic)} className="subscribe-btn">
            {topic} Alerts
          </button>
        ))}
      </div>

      <div className="subscribed-topics">
        <h3>Subscribed Topics:</h3>
        <ul>
          {subscribedTopics.map((topic, index) => (
            <li key={index}>{topic}</li>
          ))}
        </ul>
      </div>

      {alert && <div className="alert"><strong>{alert}</strong></div>}

      <div className="fire-news">
        <h3>News</h3>
        {fireNews.length > 0 ? (
          fireNews.map((article, index) => (
            <div key={index} className="news-article">
              <h4>{article.title}</h4>
              <p>{article.description}</p>
              <a href={article.url} target="_blank" rel="noopener noreferrer">Read more</a>
            </div>
          ))
        ) : (
          <p>No news available for this location.</p>
        )}
      </div>
    </div>
  );
};

export default WeatherAlerts;
