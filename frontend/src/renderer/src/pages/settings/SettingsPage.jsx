/**
 * Settings Page
 * 
 * Application settings and configuration
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { get, put } from '../../services/api';

const SettingsPage = () => {
    const { theme, setTheme, isDark } = useTheme();
    const { success, error: showError } = useToast();
    const { user } = useAuth();
    const { currencies, updateCurrencySettings, fetchCurrencySettings } = useCurrency();

    const [settings, setSettings] = useState({
        storeName: 'My Store',
        storeAddress: '123 Main Street',
        storePhone: '(123) 456-7890',
        storeEmail: 'store@example.com',
        taxRate: 10,
        taxEnabled: true,
        currency: 'USD',
        receiptFooter: 'Thank you for your purchase!',
        lowStockThreshold: 10,
        autoPrintReceipt: false
    });

    // Currency-specific settings
    const [currencySettings, setCurrencySettingsLocal] = useState({
        currency_code: 'USD',
        currency_symbol: '$'
    });

    const [savingCurrency, setSavingCurrency] = useState(false);

    // Load currency settings from backend on mount
    useEffect(() => {
        loadCurrencySettings();
    }, []);

    const loadCurrencySettings = async () => {
        try {
            const response = await get('/settings/currency');
            if (response.data) {
                setCurrencySettingsLocal({
                    currency_code: response.data.currency_code || 'USD',
                    currency_symbol: response.data.currency_symbol || '$'
                });
            }
        } catch (err) {
            console.error('Error loading currency settings:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCurrencyChange = async (e) => {
        const { name, value } = e.target;
        
        // Update local state
        let updatedSettings = { ...currencySettings, [name]: value };
        
        // Auto-update symbol when currency changes
        if (name === 'currency_code') {
            const currency = currencies[value];
            if (currency) {
                updatedSettings.currency_symbol = currency.symbol;
            }
            
            // Auto-save when currency code changes
            setCurrencySettingsLocal(updatedSettings);
            try {
                setSavingCurrency(true);
                await updateCurrencySettings({
                    currency_code: updatedSettings.currency_code,
                    currency_symbol: updatedSettings.currency_symbol
                });
                success(`Currency changed to ${value}`);
            } catch (err) {
                showError('Failed to auto-save currency');
            } finally {
                setSavingCurrency(false);
            }
        } else {
            setCurrencySettingsLocal(updatedSettings);
        }
    };

    const handleSaveCurrency = async () => {
        try {
            setSavingCurrency(true);
            const successResult = await updateCurrencySettings(currencySettings);
            if (successResult) {
                success('Currency settings saved successfully');
                // Refresh global currency context
                fetchCurrencySettings();
            } else {
                showError('Failed to save currency settings');
            }
        } catch (err) {
            console.error('Error saving currency:', err);
            showError('Failed to save currency settings');
        } finally {
            setSavingCurrency(false);
        }
    };

    const handleSave = () => {
        // Save settings to localStorage (browser environment)
        localStorage.setItem('app_settings', JSON.stringify(settings));
        success('Settings saved successfully');
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Configure your POS system
                </p>
            </div>

            {/* Currency Settings */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Currency Settings</h3>
                </div>
                <div className="card-body space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configure your base currency. All product prices will be displayed in the selected currency without numerical conversion.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">Currency</label>
                            <select
                                name="currency_code"
                                value={currencySettings.currency_code}
                                onChange={handleCurrencyChange}
                                className="form-input"
                            >
                                {Object.values(currencies).map(currency => (
                                    <option key={currency.code} value={currency.code}>
                                        {currency.code} ({currency.symbol}) - {currency.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="form-label">Currency Symbol</label>
                            <input
                                type="text"
                                name="currency_symbol"
                                value={currencySettings.currency_symbol}
                                onChange={handleCurrencyChange}
                                className="form-input"
                                placeholder="e.g., $ or Rs"
                                maxLength={5}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Current Display:</strong> {currencySettings.currency_symbol}10.00
                            <br />
                            Example: A product costing 10 will display as {currencySettings.currency_symbol}10.00
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <button 
                            onClick={handleSaveCurrency} 
                            className="btn btn-primary"
                            disabled={savingCurrency}
                        >
                            {savingCurrency ? 'Saving...' : 'Save Currency Settings'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
                </div>
                <div className="card-body space-y-4">
                    <div>
                        <label className="form-label">Theme</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${theme === 'light'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <svg className="w-8 h-8 mx-auto mb-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span className="font-medium text-gray-900 dark:text-white">Light</span>
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${theme === 'dark'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <svg className="w-8 h-8 mx-auto mb-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                                <span className="font-medium text-gray-900 dark:text-white">Dark</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Information */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Store Information</h3>
                </div>
                <div className="card-body space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Store Name</label>
                            <input
                                type="text"
                                name="storeName"
                                value={settings.storeName}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">Phone</label>
                            <input
                                type="tel"
                                name="storePhone"
                                value={settings.storePhone}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="storeEmail"
                                value={settings.storeEmail}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">Address</label>
                            <input
                                type="text"
                                name="storeAddress"
                                value={settings.storeAddress}
                                onChange={handleChange}
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Settings */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tax Settings</h3>
                </div>
                <div className="card-body space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="taxEnabled"
                            checked={settings.taxEnabled}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Enable tax calculation</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Tax Rate (%)</label>
                            <input
                                type="number"
                                name="taxRate"
                                value={settings.taxRate}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                className="form-input"
                                disabled={!settings.taxEnabled}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Settings */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Settings</h3>
                </div>
                <div className="card-body space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="autoPrintReceipt"
                            checked={settings.autoPrintReceipt}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Auto-print receipt after sale</span>
                    </label>
                    <div>
                        <label className="form-label">Receipt Footer Text</label>
                        <textarea
                            name="receiptFooter"
                            value={settings.receiptFooter}
                            onChange={handleChange}
                            rows={2}
                            className="form-input"
                        />
                    </div>
                </div>
            </div>

            {/* Inventory Settings */}
            <div className="card">
                <div className="card-header">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Settings</h3>
                </div>
                <div className="card-body space-y-4">
                    <div>
                        <label className="form-label">Low Stock Threshold (Default)</label>
                        <input
                            type="number"
                            name="lowStockThreshold"
                            value={settings.lowStockThreshold}
                            onChange={handleChange}
                            min="0"
                            className="form-input w-48"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Products below this quantity will trigger low stock alerts
                        </p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button onClick={handleSave} className="btn btn-primary">
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
