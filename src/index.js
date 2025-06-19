import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const container = document.getElementById('fitbuds-appointments-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}