import AiArena from './AiArena';
import DiscoveryPage, { discoveryPaths } from './DiscoveryPage';
import GuidePage from './GuidePage';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LegalPage, { legalPaths } from './LegalPage';
import { initializeStorage } from './storage';
import './styles.css';
import './home.css';
import './theme-motion.css';
import './light-theme.css';
import './theme-picker.css';
import './redesign.css';
import './legal.css';
import './auth.css';
import './dashboard.css';
import './motion.css';
import { initializeTheme } from './themes';
initializeStorage();
initializeTheme();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {location.pathname.startsWith('/ai-arena') ? (
      <AiArena path={location.pathname} />
    ) : discoveryPaths.includes(location.pathname) ? (
      <DiscoveryPage path={location.pathname} />
    ) : location.pathname === '/how-it-works' ? (
      <GuidePage />
    ) : legalPaths.includes(location.pathname) ? (
      <LegalPage />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
