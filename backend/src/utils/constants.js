/**
 * Application Constants
 * 
 * Centralized constants for the POS system including:
 * - User roles and permissions
 * - Sale and inventory statuses
 * - HTTP status codes
 * - Error codes
 * - Pagination settings
 * - Default configuration values
 */

// ============================================
// USER ROLES
// ============================================

/**
 * User role definitions
 * @constant {Object}
 */
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier'
};

/**
 * Role hierarchy for permission comparisons (higher = more access)
 * @constant {Object}
 */
const ROLE_HIERARCHY = {
    admin: 3,
    manager: 2,
    cashier: 1
};

// ============================================
// SALE STATUS
// ============================================

/**
 * Possible statuses for a sale
 * @constant {Object}
 */
const SALE_STATUS = {
    COMPLETED: 'completed',
    VOIDED: 'voided',
    REFUNDED: 'refunded'
};

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Accepted payment methods
 * @constant {Object}
 */
const PAYMENT_METHODS = {
    CASH: 'cash',
    CARD: 'card',
    MIXED: 'mixed'
};

// ============================================
// PURCHASE ORDER STATUS
// ============================================

/**
 * Possible statuses for a purchase order
 * @constant {Object}
 */
const PO_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    RECEIVED: 'received',
    CANCELLED: 'cancelled'
};

// ============================================
// INVENTORY TRANSACTION TYPES
// ============================================

/**
 * Types of inventory transactions
 * @constant {Object}
 */
const INVENTORY_TRANSACTION_TYPES = {
    SALE: 'sale',
    PURCHASE: 'purchase',
    ADJUSTMENT: 'adjustment',
    RETURN: 'return'
};

// ============================================
// STOCK STATUS
// ============================================

/**
 * Stock level statuses
 * @constant {Object}
 */
const STOCK_STATUS = {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock'
};

// ============================================
// ERROR CODES
// ============================================

/**
 * Application-specific error codes
 * @constant {Object}
 */
const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
};

// ============================================
// HTTP STATUS CODES
// ============================================

/**
 * Standard HTTP status codes used in the application
 * @constant {Object}
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
};

// ============================================
// PAGINATION SETTINGS
// ============================================

/**
 * Default pagination configuration
 * @constant {Object}
 */
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// ============================================
// DATE FORMATS
// ============================================

/**
 * Date format strings used throughout the application
 * @constant {Object}
 */
const DATE_FORMATS = {
    DISPLAY: 'YYYY-MM-DD',
    DATETIME_DISPLAY: 'YYYY-MM-DD HH:mm:ss',
    INVOICE: 'YYYYMMDD'
};

// ============================================
// DEFAULT SETTINGS
// ============================================

/**
 * Default system configuration values
 * @constant {Object}
 */
const DEFAULT_SETTINGS = {
    TAX_RATE: 10.00,
    CURRENCY_SYMBOL: '$',
    CURRENCY_CODE: 'USD',
    LOW_STOCK_THRESHOLD: 10,
    INVOICE_PREFIX: 'INV',
    PO_PREFIX: 'PO'
};

// ============================================
// PERMISSIONS
// ============================================

/**
 * Available permission keys in the system
 * @constant {Object}
 */
const PERMISSIONS = {
    // Dashboard permissions
    VIEW_DASHBOARD: 'view_dashboard',
    
    // Product permissions
    VIEW_PRODUCTS: 'view_products',
    CREATE_PRODUCTS: 'create_products',
    EDIT_PRODUCTS: 'edit_products',
    DELETE_PRODUCTS: 'delete_products',
    
    // Category permissions
    VIEW_CATEGORIES: 'view_categories',
    MANAGE_CATEGORIES: 'manage_categories',
    
    // Sales permissions
    CREATE_SALES: 'create_sales',
    VIEW_SALES: 'view_sales',
    VOID_SALES: 'void_sales',
    
    // Inventory permissions
    VIEW_INVENTORY: 'view_inventory',
    ADJUST_INVENTORY: 'adjust_inventory',
    
    // Supplier permissions
    VIEW_SUPPLIERS: 'view_suppliers',
    MANAGE_SUPPLIERS: 'manage_suppliers',
    
    // Purchase order permissions
    VIEW_PURCHASE_ORDERS: 'view_purchase_orders',
    CREATE_PURCHASE_ORDERS: 'create_purchase_orders',
    APPROVE_PURCHASE_ORDERS: 'approve_purchase_orders',
    RECEIVE_PURCHASE_ORDERS: 'receive_purchase_orders',
    
    // Report permissions
    VIEW_REPORTS: 'view_reports',
    EXPORT_REPORTS: 'export_reports',
    
    // User management permissions
    VIEW_USERS: 'view_users',
    MANAGE_USERS: 'manage_users',
    
    // Settings permissions
    VIEW_SETTINGS: 'view_settings',
    MANAGE_SETTINGS: 'manage_settings'
};

// ============================================
// ROLE-PERMISSION MAPPING
// ============================================

/**
 * Maps each role to its allowed permissions
 * @constant {Object}
 */
const ROLE_PERMISSIONS = {
    // Admin has all permissions
    admin: Object.values(PERMISSIONS),
    
    // Manager has most operational permissions
    manager: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.CREATE_PRODUCTS,
        PERMISSIONS.EDIT_PRODUCTS,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.MANAGE_CATEGORIES,
        PERMISSIONS.CREATE_SALES,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VOID_SALES,
        PERMISSIONS.VIEW_INVENTORY,
        PERMISSIONS.ADJUST_INVENTORY,
        PERMISSIONS.VIEW_SUPPLIERS,
        PERMISSIONS.MANAGE_SUPPLIERS,
        PERMISSIONS.VIEW_PURCHASE_ORDERS,
        PERMISSIONS.CREATE_PURCHASE_ORDERS,
        PERMISSIONS.APPROVE_PURCHASE_ORDERS,
        PERMISSIONS.RECEIVE_PURCHASE_ORDERS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_REPORTS
    ],
    
    // Cashier has limited permissions
    cashier: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_PRODUCTS,
        PERMISSIONS.VIEW_CATEGORIES,
        PERMISSIONS.CREATE_SALES,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VIEW_INVENTORY,
        PERMISSIONS.VIEW_SUPPLIERS,
        PERMISSIONS.VIEW_PURCHASE_ORDERS
    ]
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    SALE_STATUS,
    PAYMENT_METHODS,
    PO_STATUS,
    INVENTORY_TRANSACTION_TYPES,
    STOCK_STATUS,
    ERROR_CODES,
    HTTP_STATUS,
    PAGINATION,
    DATE_FORMATS,
    DEFAULT_SETTINGS,
    PERMISSIONS,
    ROLE_PERMISSIONS
};
