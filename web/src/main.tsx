import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSmsListener } from './services/smsListener';
import './styles/global.css';

// Initialize real-time SMS event stream at application bootstrap
initSmsListener();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
