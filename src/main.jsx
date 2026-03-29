import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Patch global fetch to silently suppress all /app-logs requests.
// These return 405 and were causing app crashes. Logging must NEVER block the UI.
const _originalFetch = window.fetch.bind(window);
window.fetch = function patchedFetch(input, init) {
  try {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    if (url && url.includes('/app-logs')) {
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
  } catch (_) {
    // ignore any error in the patch itself
  }
  return _originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)