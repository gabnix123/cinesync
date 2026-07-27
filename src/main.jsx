import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// This file is the React entry point.
// It finds the <div id="root"> in index.html and mounts the App component inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
