/**
 * Dashboard Page Component
 * 
 * Main dashboard displaying key metrics and widgets including:
 * - Sales statistics (today and monthly)
 * - Product counts and low stock alerts
 * - Sales chart visualization
 * - Top products list
 * - Recent sales activity
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Dashboard component imports
import StatCard from '../../components/Dashboard/StatCard';
import SalesChart from '../../components/Dashboard/SalesChart';
import TopProducts from '../../components/Dashboard/TopProducts';
import LowStockAlert from '../../components/Dashboard/LowStockAlert';
import RecentSales from '../../components/Dashboard/RecentSales';

/**
 * Dashboard Page Component
 * Displays store metrics and real-time data
 */
const DashboardPage = () => {
    // Authentication context
    const { user: currentUser } = useAuth();

    // Loading state
    const [isLoading, setIsLoading] = useState(true);

    // Dashboard data state with default values
    const [dashboardData, setDashboardData] = useState({
        stats: {
            todaySales: 0,
            todayOrders: 0,
            monthlyRevenue: 0,
            monthlyOrders: 0,
            totalProducts: 0,
            lowStockCount: 0
        },
        salesChart: [],
        topProducts: [],
        lowStockProducts: [],
        recentSales: []
    });

    /**
     * Fetches all dashboard data from the API
     * Uses Promise.all for parallel requests with error handling
     */
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);

                // Fetch all dashboard components in parallel
                const [
                    statsResponse,
                    chartResponse,
                    topProductsResponse,
                    lowStockResponse,
                    recentSalesResponse
                ] = await Promise.all([
                    // Statistics endpoint
                    api.get('/dashboard/stats').catch(() => ({ 
                        data: { data: dashboardData.stats } 
                    })),
                    // Sales chart endpoint
                    api.get('/dashboard/sales-chart').catch(() => ({ 
                        data: { data: [] } 
                    })),
                    // Top products endpoint
                    api.get('/dashboard/top-products').catch(() => ({ 
                        data: { data: [] } 
                    })),
                    // Low stock alert endpoint
                    api.get('/dashboard/low-stock').catch(() => ({ 
                        data: { data: [] } 
                    })),
                    // Recent sales endpoint
                    api.get('/dashboard/recent-sales').catch(() => ({ 
                        data: { data: [] } 
                    }))
                ]);

                // Update state with fetched data
                setDashboardData({
                    stats: statsResponse.data.data || dashboardData.stats,
                    salesChart: chartResponse.data.data || [],
                    topProducts: topProductsResponse.data.data || [],
                    lowStockProducts: lowStockResponse.data.data || [],
                    recentSales: recentSalesResponse.data.data || []
                });
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    /**
     * Formats a numeric amount as USD currency
     * @param {number} amount - The amount to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    /**
     * Returns a greeting based on the current hour
     * @returns {string} Time-appropriate greeting
     */
    const getTimeBasedGreeting = () => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) return 'Good morning';
        if (currentHour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Show loading spinner while fetching data
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {getTimeBasedGreeting()}, {currentUser?.full_name || currentUser?.username}!
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Here's what's happening with your store today.
                    </p>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Sales Card */}
                <StatCard
                    title="Today's Sales"
                    value={formatCurrency(dashboardData.stats.todaySales)}
                    subtitle={`${dashboardData.stats.todayOrders} orders`}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    color="blue"
                />
                
                {/* Monthly Revenue Card */}
                <StatCard
                    title="Monthly Revenue"
                    value={formatCurrency(dashboardData.stats.monthlyRevenue)}
                    subtitle={`${dashboardData.stats.monthlyOrders} orders`}
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                    color="green"
                />
                
                {/* Total Products Card */}
                <StatCard
                    title="Total Products"
                    value={dashboardData.stats.totalProducts}
                    subtitle="Active products"
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    }
                    color="purple"
                />
                
                {/* Low Stock Alert Card */}
                <StatCard
                    title="Low Stock Alert"
                    value={dashboardData.stats.lowStockCount}
                    subtitle="Products need restock"
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    }
                    color="red"
                    alert={dashboardData.stats.lowStockCount > 0}
                />
            </div>

            {/* Charts and Top Products Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChart data={dashboardData.salesChart} />
                </div>
                <div>
                    <TopProducts 
                        products={dashboardData.topProducts} 
                        formatCurrency={formatCurrency} 
                    />
                </div>
            </div>

            {/* Alerts and Recent Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LowStockAlert products={dashboardData.lowStockProducts} />
                <RecentSales 
                    sales={dashboardData.recentSales} 
                    formatCurrency={formatCurrency} 
                />
            </div>
        </div>
    );
};

export default DashboardPage;
