import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToAI, sendMessageToFastApi } from '../services/aiService';
import '../styles/ChatBox.css';
import polygon from './polygon.json';

const ChatBox = ({ apiSettings, onResponse, onClearMap }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

// Function to handle the demo zoom feature
const handleDemoZoom = () => {
  console.log("Executing demo zoom function");
  
  // Create a demo GeoJSON polygon for Kota Kinabalu city center
  const demoGeoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Kota Kinabalu City Center',
          description: 'Demo polygon showing the approximate boundary of KK city center'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [116.0728, 5.9804],
            [116.0835, 5.9804],
            [116.0835, 5.9704],
            [116.0728, 5.9704],
            [116.0728, 5.9804]
          ]]
        }
      }
    ]
  };

  // Create sample response with map data
  const demoResponse = {
    text: 'This is a demonstration of zooming to a location with a polygon boundary. I\'ve highlighted the approximate area of Kota Kinabalu city center.',
    mapData: {
      layers: [
        {
          type: 'geojson',
          data: demoGeoJson,
          style: {
            color: '#FF4500',      // Strong orange-red outline 
            weight: 3,
            fillColor: '#FFA500',  // Orange fill
            fillOpacity: 0.5       // More visible opacity
          },
          name: 'KK City Center Demo'
        }
      ],
      zoomTo: {
        center: [116.0782, 5.9750],
        zoom: 11
      }
    }
  };

  // Add AI message to chat
  setMessages(prevMessages => [
    ...prevMessages,
    { role: 'assistant', content: demoResponse.text }
  ]);

  // Send the demo data to the map component
  if (onResponse && typeof onResponse === 'function') {
    console.log("Calling onResponse with demo data:", demoResponse);
    onResponse(demoResponse);
  } else {
    console.error("onResponse is not a valid function", onResponse);
  }
};

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: input
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Check for special commands
      const lowerInput = input.toLowerCase();
      
      // Check for map clearing command
      if (lowerInput === 'clear map') {
        onClearMap();
        setMessages(prevMessages => [
          ...prevMessages, 
          { role: 'assistant', content: 'Map has been cleared.' }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check for demo command
      if (lowerInput.includes('demo zoom') || lowerInput.includes('show demo')) {
        console.log("Demo command detected:", input);
        handleDemoZoom();
        setIsLoading(false);
        return;
      }

      //demo for pin, zoom and polygon
      const polygonProcess = {...polygon};
      if (lowerInput.startsWith('#') && polygonProcess && polygonProcess.features) {
        const feature = polygonProcess.features.find(f => lowerInput.includes(f.properties.NAMA_DM.toLocaleLowerCase()));
        if (feature) {
          const lngList = feature.geometry.coordinates.flatMap(c => c.flatMap(n => n[0]));
          const latList = feature.geometry.coordinates.flatMap(c => c.flatMap(n => n[1]));
          const lng = (Math.min(...lngList) + Math.max(...lngList)) / 2;
          const lat = (Math.min(...latList) + Math.max(...latList)) / 2;
          const lngDiff = Math.max(...lngList) - Math.min(...lngList);
          const latDiff  = Math.max(...latList) - Math.min(...latList);
          let layers = [];
          if (lowerInput.includes('pin') || lowerInput.includes('polygon') || lowerInput.includes('draw')) {
            if (lowerInput.includes('pin')) {
              layers = [
                {
                  type: 'marker',
                  name: feature.properties.NAMA_DM,
                  lng: lng, 
                  lat: lat,
                  billboard: {}
                }
              ];
            } else {
              polygonProcess.features = [feature];
              layers = [
                {
                  type: 'geojson',
                  data: polygonProcess,
                  style: {
                    color: '#FF0000'
                  },
                  name: feature.properties.NAMA_DM
                }
              ];
            }
          } else {
            polygonProcess.features = [feature];
            layers = [
              {
                type: 'marker',
                name: feature.properties.NAMA_DM,
                lng: lng, 
                lat: lat,
                billboard: {}
              },
              {
                type: 'geojson',
                data: polygonProcess,
                style: {
                  color: '#FF0000'
                },
                name: feature.properties.NAMA_DM
              }
            ];
          }

          let zoom = 6;
          if (lngDiff >= latDiff) {
            if (lngDiff * 10 < 1) {
              zoom++;
            }

            if (lngDiff * 100 < 1) {
              zoom++;
            }
          } else {
            if (latDiff * 10 < 1) {
              zoom++;
            }

            if (latDiff * 100 < 1) {
              zoom++;
            }
          }

          const demoResponse = {
            text: 'This is a demonstration of zooming to a location with pin and polygon boundary. I\'ve highlighted the approximate area of ' + capitalizeFirstLetter(feature.properties.NAMA_DM) + ' center.',
            mapData: {
              layers: layers,
              zoomTo: {
                center: [lng, lat],
                zoom: zoom
              }
            }
          };

          setMessages(prevMessages => [
            ...prevMessages,
            { role: 'assistant', content: demoResponse.text }
          ]);

          if (onResponse && typeof onResponse === 'function') {
            console.log("Calling onResponse with demo data:", demoResponse);
            onResponse(demoResponse);
          } else {
            console.error("onResponse is not a valid function", onResponse);
          }

          return;
        }
      }
      
      // Regular AI message handling
      // const response = await sendMessageToAI({
      //   messages: [...messages, userMessage],
      //   apiSettings
      // });

      const response = await sendMessageToFastApi({
        messages: [userMessage]
      });
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { role: 'assistant', content: response.text }
      ]);
      
      // If the response contains map data, process it
      if (response.mapData) {
        onResponse(response);
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'assistant', 
          content: `Error: ${error.message || 'Failed to get response from AI'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const capitalizeFirstLetter = val => {
    val = val.toLocaleLowerCase();
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <div className="header-buttons">
          <button 
            onClick={handleDemoZoom}
            className="demo-button"
          >
            Demo Zoom
          </button>
          <button 
            onClick={() => {
              setMessages([]);
              onClearMap();
            }}
            className="clear-button"
          >
            Clear Chat
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Ask me anything about land data in Kota Kinabalu!</p>
            <div className="example-queries">
              <p>Examples:</p>
              <ul>
                <li>"Show me the land titles around Lucky Garden"</li>
                <li>"Find all primary schools in Kota Kinabalu"</li>
                <li>"What land parcels are available for commercial development near the city center?"</li>
                <li onClick={handleDemoZoom} className="demo-link">"Demo zoom to Kota Kinabalu city center"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message ai-message">
            <div className="loading-indicator">
              <span>●</span><span>●</span><span>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your query..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatBox;