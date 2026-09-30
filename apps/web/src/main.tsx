import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './home.css';
import './theme-motion.css';
import './light-theme.css';
import './theme-picker.css';
import { initializeTheme } from './themes';
initializeTheme();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
