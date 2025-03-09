import React, { useState, useEffect } from 'react';
import './WeatherAlerts.css';

const WeatherAlerts = () => {
  const [subscribedTopics, setSubscribedTopics] = useState([]);
  const [alert, setAlert] = useState('');
  const [fireNews, setFireNews] = useState([]);
  const topics = ['California', 'Florida', 'Washington']; // Available topics (States)

  useEffect(() => {
    let isMounted = true;
    const socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL || "ws://localhost:5000");

    socket.onopen = () => console.log('Connected to WebSocket server');
    
    socket.onmessage = (event) => {
      if (!isMounted) return;
      
      try {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);

        if (data.event) {
          setAlert(data.event);
        } else {
          setFireNews(prevNews => [...prevNews, data]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => console.error('WebSocket Error:', error);
    
    socket.onclose = () => console.log('WebSocket connection closed');

    return () => {
      isMounted = false;
      socket.close();
    };
  }, []);

  const subscribeToTopic = (topic) => {
    if (!subscribedTopics.includes(topic)) {
      setSubscribedTopics(prev => [...prev, topic]);
      console.log(`Subscribed to ${topic} alerts`);

      // Send subscription request over WebSocket
      const socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL || "ws://localhost:5000");
      socket.onopen = () => {
        socket.send(JSON.stringify({ subscribe: true, location: topic }));
      };
      socket.onerror = (error) => console.error("WebSocket Error:", error);
    } else {
      console.log(`Already subscribed to ${topic} alerts`);
    }
  };

  return (
    <div className="weather-alerts">
      <h1>Disaster News</h1>
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
