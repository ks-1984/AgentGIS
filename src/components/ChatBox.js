import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToAI } from '../services/aiService';
import '../styles/ChatBox.css';

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
        center: [116.0782, 5.9650],
        zoom: 12
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
      
      // Regular AI message handling
      const response = await sendMessageToAI({
        messages: [...messages, userMessage],
        apiSettings
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