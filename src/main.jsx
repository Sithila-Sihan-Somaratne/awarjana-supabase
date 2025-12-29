// src/main.jsx
// Application Entry Point

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Log application startup
console.log('🚀 [MAIN] Awarjana Creations App Started');
console.log('📦 [MAIN] Environment:', import.meta.env.DEV ? 'Development' : 'Production');
console.log('🔗 [MAIN] Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Not Configured');
