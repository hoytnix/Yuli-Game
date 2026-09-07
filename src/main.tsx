import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Storage Quota Persistence Guarantee (Invariant 7)
if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
  navigator.storage.persist().then((persisted) => {
    console.log(`[Storage] Storage persistence ${persisted ? 'guaranteed' : 'best-effort'}`);
  }).catch((err) => {
    console.warn('[Storage] Storage persistence request failed:', err);
  });
}

// Register PWA service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] ServiceWorker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
