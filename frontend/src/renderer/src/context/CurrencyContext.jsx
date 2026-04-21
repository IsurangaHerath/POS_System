/**
 * Currency Context
 * 
 * Manages currency settings and price conversion globally.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, put } from '../services/api';

const CurrencyContext = createContext(null);

// Currency configuration
const CURRENCIES = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
    LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' }
};

export const CurrencyProvider = ({ children }) => {
    const [currencySettings, setCurrencySettings] = useState({
        currency_code: 'USD',
        exchange_rate: '1',
        currency_symbol: '$'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch currency settings on mount
    useEffect(() => {
        fetchCurrencySettings();
    }, []);

    const fetchCurrencySettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await get('/settings/currency');
            if (response.data) {
                setCurrencySettings({
                    currency_code: response.data.currency_code || 'USD',
                    exchange_rate: response.data.exchange_rate || '1',
                    currency_symbol: response.data.currency_symbol || '$'
                });
            }
        } catch (err) {
            console.error('Error fetching currency settings:', err);
            setError(err.message);
            // Use defaults on error
            setCurrencySettings({
                currency_code: 'USD',
                exchange_rate: '1',
                currency_symbol: '$'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const updateCurrencySettings = useCallback(async (settings) => {
        try {
            // Get current settings to merge with updates
            const current = JSON.parse(localStorage.getItem('currency_settings') || '{}');
            const merged = { ...current, ...settings };

            // If only currency_code is provided, auto-fill symbol from CURRENCIES
            if (settings.currency_code && !settings.currency_symbol) {
                const info = CURRENCIES[settings.currency_code];
                if (info) {
                    merged.currency_symbol = info.symbol;
                }
            }

            const response = await put('/settings/currency', merged);
            if (response.data) {
                const newSettings = {
                    currency_code: response.data.currency_code || merged.currency_code,
                    exchange_rate: response.data.exchange_rate || merged.exchange_rate,
                    currency_symbol: response.data.currency_symbol || merged.currency_symbol
                };
                setCurrencySettings(newSettings);
                localStorage.setItem('currency_settings', JSON.stringify(newSettings));
            }
            return true;
        } catch (err) {
            console.error('Error updating currency settings:', err);
            setError(err.message);
            return false;
        }
    }, []);

    // Load from localStorage first for instant UI response
    useEffect(() => {
        const stored = localStorage.getItem('currency_settings');
        if (stored) {
            try {
                setCurrencySettings(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse stored currency settings');
            }
        }
        fetchCurrencySettings();
    }, [fetchCurrencySettings]);

    // Convert price from base currency (USD) to selected currency
    const convertPrice = useCallback((basePrice) => {
        if (!basePrice || isNaN(basePrice)) return 0;
        const rate = parseFloat(currencySettings.exchange_rate) || 1;
        return basePrice * rate;
    }, [currencySettings.exchange_rate]);

    // Format price with currency symbol
    const formatPrice = useCallback((price) => {
        if (price === null || price === undefined || isNaN(price)) {
            return `${currencySettings.currency_symbol}0.00`;
        }
        
        // Price is already in USD base, just convert to selected currency
        const rate = parseFloat(currencySettings.exchange_rate) || 1;
        const convertedPrice = price * rate;
        const formatted = convertedPrice.toFixed(2);
        return `${currencySettings.currency_symbol}${formatted}`;
    }, [currencySettings.currency_symbol, currencySettings.exchange_rate]);

    // Format price for reports (shows current currency info)
    const formatPriceForReport = useCallback((amount, storedRate = null) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return `${currencySettings.currency_symbol}0.00`;
        }
        
        // If stored rate is provided, use it to convert from USD base
        // This preserves the original currency value
        const rate = storedRate ? parseFloat(storedRate) : parseFloat(currencySettings.exchange_rate);
        const convertedAmount = amount * rate;
        const formatted = convertedAmount.toFixed(2);
        return `${currencySettings.currency_symbol}${formatted}`;
    }, [currencySettings.currency_symbol, currencySettings.exchange_rate]);

    // Get currency info
    const getCurrencyInfo = useCallback((code) => {
        return CURRENCIES[code] || CURRENCIES.USD;
    }, []);

    const setCurrency = useCallback(async (code) => {
        const info = CURRENCIES[code];
        if (info) {
            return await updateCurrencySettings({
                currency_code: code,
                currency_symbol: info.symbol
            });
        }
        return false;
    }, [updateCurrencySettings]);

    const value = {
        currencySettings,
        loading,
        error,
        currencies: CURRENCIES,
        fetchCurrencySettings,
        updateCurrencySettings,
        setCurrency,
        convertPrice,
        formatPrice,
        formatPriceForReport,
        getCurrencyInfo
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export default CurrencyContext;
