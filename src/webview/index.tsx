import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { postMessage } from './hooks/useVSCode';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<App />);

// Notify the extension host that the webview is ready
postMessage({ type: 'ready' });
