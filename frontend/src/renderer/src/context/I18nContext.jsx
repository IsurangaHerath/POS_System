/**
 * Localization Context (i18n)
 *
 * Lightweight i18n supporting English, Sinhala and Tamil. The app defaults to
 * English but the architecture allows switching languages (stored in
 * localStorage and the settings API). UI labels are translated via t(key).
 *
 * This is intentionally dependency-free to keep bundle size small.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LOCALE_STORAGE_KEY = 'pos_locale';

// -------------------- Dictionaries --------------------
const dictionaries = {
    en: {
        // Nav
        'nav.dashboard': 'Dashboard',
        'nav.pos': 'POS',
        'nav.sales': 'Sales',
        'nav.purchases': 'Purchases',
        'nav.products': 'Products',
        'nav.categories': 'Categories',
        'nav.inventory': 'Inventory',
        'nav.customers': 'Customers',
        'nav.suppliers': 'Suppliers',
        'nav.expenses': 'Expenses',
        'nav.reports': 'Reports',
        'nav.users': 'Employees',
        'nav.settings': 'Settings',
        'nav.returns': 'Returns',
        'nav.cashRegister': 'Cash Register',
        'nav.heldBills': 'Held Bills',
        // Common
        'common.search': 'Search',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.loading': 'Loading...',
        'common.total': 'Total',
        'common.subtotal': 'Subtotal',
        'common.discount': 'Discount',
        'common.tax': 'Tax',
        'common.balance': 'Balance'
    },
    si: {
        'nav.dashboard': 'උපකරණ පුවරුව',
        'nav.pos': 'POS',
        'nav.sales': 'විකුණුම්',
        'nav.purchases': 'මිලදී ගැනීම්',
        'nav.products': 'නිෂ්පාදන',
        'nav.categories': 'කාණ්ඩ',
        'nav.inventory': 'තොග',
        'nav.customers': 'ගනුදෙනුකරුවන්',
        'nav.suppliers': 'සැපයුම්කරුවන්',
        'nav.expenses': 'වියදම්',
        'nav.reports': 'වාර්තා',
        'nav.users': 'සේවකයින්',
        'nav.settings': 'සැකසුම්',
        'nav.returns': 'ආපසු',
        'nav.cashRegister': 'මුදල් ලේඛනය',
        'nav.heldBills': 'රඳවාගත් බිල්පත්',
        'common.search': 'සොයන්න',
        'common.save': 'සුරකින්න',
        'common.cancel': 'අවලංගු',
        'common.delete': 'මකන්න',
        'common.edit': 'සංස්කරණය',
        'common.add': 'එකතු',
        'common.loading': 'පූරණය වෙමින්...',
        'common.total': 'මුළු',
        'common.subtotal': 'අතුරු එකතුව',
        'common.discount': 'වට්ටම',
        'common.tax': 'බද්ද',
        'common.balance': 'ශේෂය'
    },
    ta: {
        'nav.dashboard': 'டாஷ்போர்டு',
        'nav.pos': 'POS',
        'nav.sales': 'விற்பனை',
        'nav.purchases': 'கொள்முதல்',
        'nav.products': 'பொருட்கள்',
        'nav.categories': 'வகைகள்',
        'nav.inventory': 'இருப்பு',
        'nav.customers': 'வாடிக்கையாளர்கள்',
        'nav.suppliers': 'சப்ளையர்கள்',
        'nav.expenses': 'செலவுகள்',
        'nav.reports': 'அறிக்கைகள்',
        'nav.users': 'ஊழியர்கள்',
        'nav.settings': 'அமைப்புகள்',
        'nav.returns': 'திருப்பங்கள்',
        'nav.cashRegister': 'பண பதிவேடு',
        'nav.heldBills': 'வைத்த பில்கள்',
        'common.search': 'தேடு',
        'common.save': 'சேமி',
        'common.cancel': 'ரத்து',
        'common.delete': 'நீக்கு',
        'common.edit': 'தொகு',
        'common.add': 'சேர்',
        'common.loading': 'ஏற்றுகிறது...',
        'common.total': 'மொத்தம்',
        'common.subtotal': 'துணைத்தொகை',
        'common.discount': 'தள்ளுபடி',
        'common.tax': 'வரி',
        'common.balance': 'இருப்பு'
    }
};

const LOCALES = ['en', 'si', 'ta'];

const i18nContext = createContext(null);

export const useI18n = () => {
    const ctx = useContext(i18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
};

export const I18nProvider = ({ children }) => {
    const [locale, setLocaleState] = useState(() => {
        return localStorage.getItem(LOCALE_STORAGE_KEY) || 'en';
    });

    useEffect(() => {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        document.documentElement.lang = locale;
    }, [locale]);

    const t = useCallback((key) => {
        const dict = dictionaries[locale] || dictionaries.en;
        return dict[key] || dictionaries.en[key] || key;
    }, [locale]);

    const setLocale = useCallback((lang) => {
        if (LOCALES.includes(lang)) {
            setLocaleState(lang);
        }
    }, []);

    const value = {
        locale,
        setLocale,
        t,
        locales: LOCALES,
        /** Sri Lankan style money formatting */
        formatMoney: (amount) => {
            const n = Number(amount) || 0;
            return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    return <i18nContext.Provider value={value}>{children}</i18nContext.Provider>;
};

export default i18nContext;