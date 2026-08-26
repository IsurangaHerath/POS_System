/**
 * React Application Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import './index.css';

// Get root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render application
root.render(
    <React.StrictMode>
        <HashRouter>
            <ThemeProvider>
                <ToastProvider>
                    <CartProvider>
                        <AuthProvider>
                            <App />
                        </AuthProvider>
                    </CartProvider>
                </ToastProvider>
            </ThemeProvider>
        </HashRouter>
    </React.StrictMode>
);
