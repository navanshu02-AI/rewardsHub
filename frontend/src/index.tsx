import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#111827',
          color: '#f9fafb'
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#f9fafb'
          }
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#f9fafb'
          }
        }
      }}
    />
  </React.StrictMode>
);
