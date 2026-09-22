import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initBrowserPrinterAPI } from './browser-api';

if (typeof window !== 'undefined' && !window.printerAPI) {
  window.printerAPI = initBrowserPrinterAPI();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
