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
            const response = await put('/settings/currency', settings);
            if (response.data) {
                setCurrencySettings({
                    currency_code: response.data.currency_code || settings.currency_code,
                    exchange_rate: response.data.exchange_rate || settings.exchange_rate,
                    currency_symbol: response.data.currency_symbol || settings.currency_symbol
                });
            }
            return true;
        } catch (err) {
            console.error('Error updating currency settings:', err);
            setError(err.message);
            return false;
        }
    }, []);

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
        
        const convertedPrice = convertPrice(price);
        const formatted = convertedPrice.toFixed(2);
        return `${currencySettings.currency_symbol}${formatted}`;
    }, [currencySettings.currency_symbol, convertPrice]);

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

    const value = {
        currencySettings,
        loading,
        error,
        currencies: CURRENCIES,
        fetchCurrencySettings,
        updateCurrencySettings,
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
