import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<main style="padding:24px;font-family:system-ui;background:#fff8ea;color:#14201f;min-height:100vh"><h1>Sweetwater Grill Scheduler</h1><p>App root was not found. Check index.html for <div id="root"></div>.</p></main>';
} else {
  ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
  );
}
