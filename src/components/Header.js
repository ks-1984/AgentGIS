import React from 'react';

const Header = ({ onSettingsClick }) => {
  return (
    <header className="app-header">
      <div className="logo">
        <img src='/jtu_logo.png' />
        <h1>GeoSurvey Browser</h1>
      </div>
      <nav>
        <button onClick={onSettingsClick} className="chatbot-button nav-button">
          Settings
        </button>
        <button className="fake-button"></button>
        <button className="download-button nav-button right-button">
          Download
        </button>
        <button className="map-window-button nav-button right-button">
          Map Window
        </button>
        <button className="dashboard-button nav-button right-button">
          Dashboard
        </button>
      </nav>
    </header>
  );
};

export default Header;