/**
 * Main Application Component
 * 
 * Sets up React Router with protected and public routes.
 * Handles authentication state and role-based access control.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Page components
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import CategoriesPage from './pages/products/CategoriesPage';
import POSPage from './pages/pos/POSPage';
import SalesPage from './pages/sales/SalesPage';
import SaleDetailPage from './pages/sales/SaleDetailPage';
import InventoryPage from './pages/inventory/InventoryPage';
import SuppliersPage from './pages/inventory/SuppliersPage';
import PurchaseOrdersPage from './pages/inventory/PurchaseOrdersPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Context providers
import { CurrencyProvider } from './context/CurrencyContext';

/**
 * Protected Route Component
 * 
 * Restricts access to authenticated users with required role level.
 * Redirects to login if not authenticated, or to dashboard if role is insufficient.
 * 
 * @param {React.ReactNode} children - Child components to render if authorized
 * @param {string} [requiredRole] - Minimum role required (e.g., 'admin', 'manager')
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, isLoading, hasMinRole } = useAuth();

    // If auth is still loading, show spinner
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Redirect to dashboard if user doesn't have required role
    if (requiredRole && !hasMinRole(requiredRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

/**
 * Public Route Component
 * 
 * Restricts access to unauthenticated users.
 * Redirects to dashboard if already authenticated.
 * Shows login immediately.
 * 
 * @param {React.ReactNode} children - Child components to render if not authenticated
 */
const PublicRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    // If auth is still loading, show spinner instead of blank screen
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

/**
 * Main Application Component
 * 
 * Defines all application routes with appropriate access controls:
 * - Public routes (login) under AuthLayout
 * - Protected routes under MainLayout
 * - Role-specific routes (users only for admin)
 */
function App() {
    return (
        <CurrencyProvider>
            <Routes>
                {/* Public authentication routes */}
                <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
                    <Route path="/login" element={<LoginPage />} />
                </Route>

                {/* Protected application routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Main dashboard and navigation */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/pos" element={<POSPage />} />
                    
                    {/* Sales routes */}
                    <Route path="/sales" element={<SalesPage />} />
                    <Route path="/sales/:id" element={<SaleDetailPage />} />
                    
                    {/* Inventory management routes */}
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                    
                    {/* Reports - accessible to managers and admins */}
                    <Route path="/reports" element={<ReportsPage />} />
                    
                    {/* Admin-only user management */}
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    
                    {/* User-specific routes */}
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>

                {/* Default redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </CurrencyProvider>
    );
}

export default App;
