import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { WhiteLabelProvider } from './contexts/WhiteLabelContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WhiteLabelProvider>
      <App />
    </WhiteLabelProvider>
  </React.StrictMode>,
);
