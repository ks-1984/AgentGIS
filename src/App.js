import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Map from './components/Map';
import ChatBox from './components/ChatBox';
import InfoPanel from './components/InfoPanel';
import SettingsModal from './components/SettingsModal';
import PopUpTable from './components/PopUpTable';
import './styles/App.css';
import {
  VerticalOrigin,
  Cartesian2,
} from 'cesium';

function App() {
  const [mapLayers, setMapLayers] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    baseUrl: process.env.REACT_APP_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
    model: 'gpt-4',
  });
  const [infoPanelData, setInfoPanelData] = useState(null);
  const [infoPanelVisible, setInfoPanelVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popUpTableData, setPopUpTableData] = useState([]);
  let layers = [];

  const clearMapLayers = () => {
    console.log("Clearing all map layers");
    layers = [{
      type: 'zoom',
      zoomTo: {
        center: [116.7968, 5.4204],
        zoom: 2.5
      }
    }];
    setMapLayers(layers);
  };

  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
    setInfoPanelData(feature.properties);
    setInfoPanelVisible(true);
  };

  const handleAIResponse = (response) => {
    console.log("Received AI response:", response);
    
    // Handle responses from the AI that might include map instructions
    if (response && response.mapData) {
      // Process the mapData structure
      if (response.mapData.layers) {
        console.log("Setting map layers from response.mapData.layers:", response.mapData.layers);
        
        // Direct layers array
        const newLayers = [...response.mapData.layers];
        
        // If there's zoom information, ensure it's passed to the Map component
        if (response.mapData.zoomTo) {
          console.log("Zoom information found:", response.mapData.zoomTo);
          // Add a special layer for zoom information
          newLayers.push({
            type: 'zoom',
            zoomTo: response.mapData.zoomTo
          });
        }
        
        setMapLayers(newLayers);
      } 
      else if (response.mapData.features) {
        console.log("Setting map layers from response.mapData.features:", response.mapData.features);
        
        // Convert features to layers
        const newLayers = response.mapData.features.map(feature => {
          // If it's already in layer format
          if (feature.type && (feature.type === 'geojson' || feature.type === 'marker')) {
            return feature;
          }
          
          // Otherwise, convert GeoJSON Feature to a layer object
          return {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [feature]
            },
            style: {
              color: '#FF4500',
              weight: 3,
              fillColor: '#FFA500',
              fillOpacity: 0.5
            }
          };
        });
        
        // If there's zoom information, add it to the layers
        if (response.mapData.zoomTo) {
          console.log("Zoom information found:", response.mapData.zoomTo);
          // Add zoom info to the first layer
          if (newLayers.length > 0) {
            newLayers[0].zoomTo = response.mapData.zoomTo;
          }
        }
        
        setMapLayers(newLayers);
      }
      else {
        // If mapData is a direct layer object
        console.log("Setting mapData as a direct layer:", response.mapData);
        setMapLayers([response.mapData]);
      }
    }
    
    if (response && response.infoData) {
      setInfoPanelData(response.infoData);
      setInfoPanelVisible(true);
    }
  };

  const handleTablePopUpResponse = (response) => {
    if (response.tableData) {
      setPopUpTableData(response.tableData);
      setShowPopup(true);
    }
  }

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="app">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <div className="main-content">
        <Map 
          layers={mapLayers} 
          onFeatureSelect={handleFeatureSelect}
        />
        
        <div className="sidebar">
          <ChatBox 
            apiSettings={apiSettings}
            onResponse={handleAIResponse}
            onTableResponse={handleTablePopUpResponse}
            onClearMap={clearMapLayers}
          />
          
          {infoPanelVisible && (
            <InfoPanel 
              data={infoPanelData} 
              onClose={() => setInfoPanelVisible(false)}
            />
          )}
        </div>
      </div>
      
      {showSettings && (
        <SettingsModal
          settings={apiSettings}
          onSave={(newSettings) => {
            setApiSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPopup && (
        <PopUpTable 
        popUpTableData={popUpTableData} 
        onClose={handleClosePopup} />
      )}
    </div>
  );
}

export default App;