# POS System - Comprehensive Documentation

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Core Features](#2-core-features)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [API Endpoints](#4-api-endpoints)
5. [Data Models](#5-data-models)
6. [Frontend Pages](#6-frontend-pages)
7. [Context and State Management](#7-context-and-state-management)
8. [Configuration Requirements](#8-configuration-requirements)
9. [Deployment Requirements](#9-deployment-requirements)

---

## 1. System Overview

### 1.1 Introduction
The POS (Point of Sale) System is a full-stack web application designed for retail business management. It provides comprehensive functionality for managing sales, inventory, products, suppliers, and reporting through an intuitive web interface.

### 1.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js / Express.js |
| Database | MySQL 8.0+ |
| Frontend | React 18+ with Vite |
| Styling | Tailwind CSS |
| Authentication | JWT (JSON Web Tokens) |
| Deployment Target | Cloud-based (No Electron) |

### 1.3 Project Structure

```
d:/Projects/POS/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── app.js            # Main Express application
│   │   ├── server.js          # Server entry point
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Auth, RBAC, error handling
│   │   ├── models/           # Database models
│   │   ├── routes/           # API route definitions
│   │   └── utils/            # Constants, helpers, utilities
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── main/             # Electron main process (to be removed)
│   │   └── renderer/         # React application
│   │       └── src/
│   │           ├── components/    # Reusable UI components
│   │           ├── contexts/       # React Context providers
│   │           ├── layouts/       # Page layouts
│   │           ├── pages/         # Route pages
│   │           ├── services/      # API service layer
│   │           └── App.jsx        # Main React component
│   └── package.json
├── database/                   # SQL schema and seeds
├── docs/                       # API and setup documentation
└── plans/                      # Architecture planning docs
```

---

## 2. Core Features

### 2.1 Authentication Module
- **Login**: User authentication with username/password
- **Token Management**: JWT-based access tokens (15 min expiry) and refresh tokens (7 days)
- **Session Management**: Logout functionality to invalidate sessions
- **Password Management**: Change password, admin reset password
- **Self-Registration**: Optional user self-registration

### 2.2 User Management Module
- **CRUD Operations**: Create, read, update, delete users
- **Role Assignment**: Assign roles (admin, manager, cashier)
- **Account Status**: Activate/deactivate user accounts
- **Profile Management**: View and edit own profile

### 2.3 Product Management Module
- **Product CRUD**: Create, read, update, delete products
- **Barcode Support**: Product lookup by barcode
- **SKU Management**: Stock Keeping Unit tracking
- **Pricing**: Cost price and selling price management
- **Category Association**: Assign products to categories
- **Tax Rates**: Per-product tax configuration
- **Image Support**: Product image URLs

### 2.4 Category Management Module
- **Category CRUD**: Create, read, update, delete categories
- **Hierarchical Categories**: Parent-child category relationships
- **Category Status**: Activate/deactivate categories

### 2.5 Inventory Management Module
- **Stock Tracking**: Real-time inventory quantities
- **Stock Reservations**: Reserved quantity tracking
- **Stock Alerts**: Low stock and out of stock notifications
- **Inventory Logs**: Complete audit trail of all inventory changes
- **Manual Adjustments**: Add, subtract, or set inventory quantities

### 2.6 Sales Module
- **Point of Sale (POS)**: Interactive cart and checkout interface
- **Multiple Payment Methods**: Cash, card, or mixed payments
- **Invoice Generation**: Generate invoice numbers and receipts
- **Sale History**: View all past transactions
- **Sale Details**: Detailed breakdown of each sale
- **Void Sales**: Manager/Admin can void transactions
- **Discount Support**: Apply discounts to sales

### 2.7 Purchase Order Module
- **PO Creation**: Create purchase orders to suppliers
- **PO Status Tracking**: Pending, approved, received, cancelled
- **Partial Receiving**: Receive partial orders
- **Expected Delivery**: Track expected delivery dates

### 2.8 Supplier Management Module
- **Supplier CRUD**: Create, read, update, delete suppliers
- **Contact Information**: Phone, email, address management
- **Payment Terms**: Track supplier payment terms
- **Tax ID**: Supplier tax identification

### 2.9 Reports Module
- **Daily Sales Report**: Sales summary for current day
- **Monthly Sales Report**: Monthly sales aggregation
- **Product Performance**: Top-selling products analysis
- **Export Capabilities**: CSV and PDF export options

### 2.10 Dashboard Module
- **Summary Statistics**: Total sales, orders, customers
- **Sales Chart**: Visual sales trends
- **Top Products**: Best-selling products list
- **Low Stock Alerts**: Products below reorder level
- **Recent Sales**: Latest transactions list

### 2.11 Settings Module
- **System Configuration**: Global system settings
- **Currency Settings**: Currency code, symbol, exchange rate
- **Tax Rate**: Default tax configuration
- **Low Stock Threshold**: Default reorder levels

---

## 3. User Roles and Permissions

### 3.1 Role Hierarchy
The system implements a role-based access control (RBAC) system with three roles:

| Role | Level | Description |
|------|-------|-------------|
| Admin | 3 | Full system access |
| Manager | 2 | Limited management access |
| Cashier | 1 | Basic transaction access |

### 3.2 Permission Matrix

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| **Authentication** |
| Login/Logout | ✓ | ✓ | ✓ |
| Change Password | ✓ | ✓ | ✓ |
| **User Management** |
| View Users | ✓ | ✗ | ✗ |
| Create Users | ✓ | ✗ | ✗ |
| Edit Users | ✓ | ✗ | ✗ |
| Delete Users | ✓ | ✗ | ✗ |
| **Product Management** |
| View Products | ✓ | ✓ | ✓ |
| Create Products | ✓ | ✓ | ✗ |
| Edit Products | ✓ | ✓ | ✗ |
| Delete Products | ✓ | ✗ | ✗ |
| **Category Management** |
| Manage Categories | ✓ | ✓ | ✗ |
| **Inventory** |
| View Inventory | ✓ | ✓ | ✓ |
| Adjust Inventory | ✓ | ✓ | ✗ |
| View Logs | ✓ | ✓ | ✗ |
| **Sales** |
| Create Sales | ✓ | ✓ | ✓ |
| View Sales | ✓ | ✓ | ✓ |
| Void Sales | ✓ | ✓ | ✗ |
| Generate Receipts | ✓ | ✓ | ✓ |
| **Purchase Orders** |
| Manage POs | ✓ | ✓ | ✗ |
| **Suppliers** |
| Manage Suppliers | ✓ | ✓ | ✗ |
| **Reports** |
| View Reports | ✓ | ✓ | ✗ |
| Export Reports | ✓ | ✓ | ✗ |
| **Dashboard** |
| View Dashboard | ✓ | ✓ | ✓ |
| **Settings** |
| System Settings | ✓ | ✗ | ✗ |
| Currency Settings | ✓ | ✗ | ✗ |

---

## 4. API Endpoints

### 4.1 Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | User login | Public |
| POST | `/auth/logout` | User logout | Authenticated |
| POST | `/auth/refresh` | Refresh access token | Authenticated |
| GET | `/auth/me` | Get current user | Authenticated |
| PUT | `/auth/password` | Change password | Authenticated |
| POST | `/auth/reset-password/:userId` | Admin reset password | Admin |

### 4.2 User Routes (`/api/users`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users` | List all users | Admin |
| GET | `/users/:id` | Get user by ID | Admin |
| POST | `/users` | Create user | Admin |
| PUT | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete (deactivate) user | Admin |

### 4.3 Product Routes (`/api/products`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/products` | List products with pagination | Authenticated |
| GET | `/products/low-stock` | Get low stock products | Authenticated |
| GET | `/products/barcode/:barcode` | Get product by barcode | Authenticated |
| GET | `/products/:id` | Get product by ID | Authenticated |
| POST | `/products` | Create product | Manager+ |
| PUT | `/products/:id` | Update product | Manager+ |
| DELETE | `/products/:id` | Delete product | Admin |

### 4.4 Category Routes (`/api/categories`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/categories` | List categories | Authenticated |
| GET | `/categories/:id` | Get category by ID | Authenticated |
| POST | `/categories` | Create category | Manager+ |
| PUT | `/categories/:id` | Update category | Manager+ |
| DELETE | `/categories/:id` | Delete category | Admin |

### 4.5 Sales Routes (`/api/sales`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/sales` | List sales with pagination | Authenticated |
| GET | `/sales/:id` | Get sale with items | Authenticated |
| POST | `/sales` | Create new sale | Authenticated |
| PUT | `/sales/:id/void` | Void a sale | Manager+ |
| GET | `/sales/:id/invoice` | Generate invoice PDF | Authenticated |
| GET | `/sales/:id/receipt` | Generate receipt HTML | Authenticated |

### 4.6 Inventory Routes (`/api/inventory`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/inventory` | Get inventory status | Authenticated |
| GET | `/inventory/logs` | Get inventory change logs | Authenticated |
| POST | `/inventory/adjust` | Adjust inventory manually | Manager+ |

### 4.7 Supplier Routes (`/api/suppliers`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/suppliers` | List suppliers | Authenticated |
| GET | `/suppliers/:id` | Get supplier by ID | Authenticated |
| POST | `/suppliers` | Create supplier | Manager+ |
| PUT | `/suppliers/:id` | Update supplier | Manager+ |
| DELETE | `/suppliers/:id` | Delete supplier | Admin |

### 4.8 Purchase Order Routes (`/api/purchase-orders`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/purchase-orders` | List purchase orders | Authenticated |
| GET | `/purchase-orders/:id` | Get PO by ID | Authenticated |
| POST | `/purchase-orders` | Create purchase order | Manager+ |
| PUT | `/purchase-orders/:id/receive` | Receive PO items | Manager+ |
| PUT | `/purchase-orders/:id/cancel` | Cancel purchase order | Manager+ |

### 4.9 Report Routes (`/api/reports`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/reports/daily-sales` | Daily sales report | Manager+ |
| GET | `/reports/monthly-sales` | Monthly sales report | Manager+ |
| GET | `/reports/product-performance` | Product performance | Manager+ |
| GET | `/reports/export/csv` | Export to CSV | Manager+ |
| GET | `/reports/export/pdf` | Export to PDF | Manager+ |

### 4.10 Dashboard Routes (`/api/dashboard`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard/summary` | Dashboard summary stats | Authenticated |
| GET | `/dashboard/sales-chart` | Sales chart data | Authenticated |
| GET | `/dashboard/top-products` | Top selling products | Authenticated |
| GET | `/dashboard/low-stock` | Low stock alerts | Authenticated |
| GET | `/dashboard/recent-sales` | Recent transactions | Authenticated |

### 4.11 Settings Routes (`/api/settings`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/settings` | Get all settings | Admin |
| GET | `/settings/currency` | Get currency settings | Public |
| PUT | `/settings/currency` | Update currency | Admin |
| GET | `/settings/:key` | Get setting by key | Admin |

---

## 5. Data Models

### 5.1 Users Table
```sql
users (
    id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'manager', 'cashier') DEFAULT 'cashier',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.2 Categories Table
```sql
categories (
    id INT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.3 Products Table
```sql
products (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id INT REFERENCES categories(id),
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    reorder_level INT DEFAULT 10,
    unit VARCHAR(20) DEFAULT 'piece',
    description TEXT,
    image_url VARCHAR(500),
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.4 Suppliers Table
```sql
suppliers (
    id INT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.5 Product Suppliers Table (Many-to-Many)
```sql
product_suppliers (
    id INT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    supplier_price DECIMAL(10,2),
    supplier_code VARCHAR(50),
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at DATETIME
)
```

### 5.6 Inventory Table
```sql
inventory (
    id INT PRIMARY KEY,
    product_id INT UNIQUE REFERENCES products(id),
    quantity_available INT DEFAULT 0,
    quantity_reserved INT DEFAULT 0,
    quantity_ordered INT DEFAULT 0,
    last_stock_check DATETIME,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.7 Sales Table
```sql
sales (
    id INT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT REFERENCES users(id),
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'mixed'),
    amount_paid DECIMAL(12,2) NOT NULL,
    change_amount DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('completed', 'voided', 'refunded') DEFAULT 'completed',
    notes TEXT,
    sale_date DATETIME NOT NULL,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.8 Sale Items Table
```sql
sale_items (
    id INT PRIMARY KEY,
    sale_id INT REFERENCES sales(id),
    product_id INT REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    product_barcode VARCHAR(50),
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at DATETIME
)
```

### 5.9 Purchase Orders Table
```sql
purchase_orders (
    id INT PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT REFERENCES suppliers(id),
    user_id INT REFERENCES users(id),
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('pending', 'approved', 'received', 'cancelled'),
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
)
```

### 5.10 Purchase Order Items Table
```sql
purchase_order_items (
    id INT PRIMARY KEY,
    purchase_order_id INT REFERENCES purchase_orders(id),
    product_id INT REFERENCES products(id),
    unit_cost DECIMAL(10,2) NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at DATETIME
)
```

### 5.11 Inventory Logs Table
```sql
inventory_logs (
    id INT PRIMARY KEY,
    product_id INT REFERENCES products(id),
    transaction_type ENUM('sale', 'purchase', 'adjustment', 'return'),
    quantity_change INT NOT NULL,
    quantity_before INT NOT NULL,
    quantity_after INT NOT NULL,
    reference_id INT,
    reference_type VARCHAR(50),
    user_id INT REFERENCES users(id),
    notes TEXT,
    created_at DATETIME
)
```

### 5.12 Settings Table
```sql
settings (
    id INT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description VARCHAR(255),
    updated_at DATETIME
)
```

### 5.13 Audit Logs Table
```sql
audit_logs (
    id INT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at DATETIME
)
```

---

## 6. Frontend Pages

### 6.1 Authentication Pages

| Page | Route | Description | Access |
|------|-------|-------------|--------|
| Login | `/login` | User login page | Public |

### 6.2 Main Application Pages

| Page | Route | Description | Access |
|------|-------|-------------|--------|
| Dashboard | `/dashboard` | Main dashboard with stats | Authenticated |
| POS | `/pos` | Point of Sale interface | Authenticated |
| Products | `/products` | Product list and management | Authenticated |
| Categories | `/categories` | Category management | Authenticated |
| Sales | `/sales` | Sales transaction history | Authenticated |
| Sale Detail | `/sales/:id` | Individual sale details | Authenticated |
| Inventory | `/inventory` | Stock management | Authenticated |
| Suppliers | `/suppliers` | Supplier management | Authenticated |
| Purchase Orders | `/purchase-orders` | PO management | Authenticated |
| Reports | `/reports` | Report generation | Manager+ |
| Users | `/users` | User management | Admin |
| Settings | `/settings` | System settings | Admin |
| Profile | `/profile` | User profile | Authenticated |

### 6.3 Frontend Components

#### Dashboard Components
- `StatCard` - Summary statistics card
- `SalesChart` - Sales trend visualization
- `RecentSales` - Latest transactions list
- `LowStockAlert` - Low stock warnings
- `TopProducts` - Best-selling products

#### Common Components
- `Modal` - Reusable modal dialog
- `Pagination` - Pagination controls

#### Cart Components
- `CartExample` - Shopping cart UI example

#### Product Components
- `ProductForm` - Product create/edit form

---

## 7. Context and State Management

### 7.1 AuthContext (`/context/AuthContext.jsx`)
Provides authentication state management:
- `user` - Current user object
- `isAuthenticated` - Authentication status
- `isLoading` - Loading state
- `login()` - Authenticate user
- `logout()` - End session
- `hasMinRole()` - Role-based access check

### 7.2 CartContext (`/context/CartContext.jsx`)
Provides shopping cart state for POS:
- `cart` - Cart items array
- `addToCart()` - Add product to cart
- `removeFromCart()` - Remove item
- `updateCartQuantity()` - Change quantity
- `clearCart()` - Empty cart
- `getCartSubtotal()` - Calculate total
- `validateCart()` - Check stock availability

### 7.3 CurrencyContext (`/context/CurrencyContext.jsx`)
Provides multi-currency support:
- `currency` - Current currency settings
- `formatCurrency()` - Format display prices

### 7.4 ThemeContext (`/context/ThemeContext.jsx`)
Provides UI theming:
- `theme` - Current theme (light/dark)
- `toggleTheme()` - Switch theme

### 7.5 ToastContext (`/context/ToastContext.jsx`)
Provides notification system:
- `success()` - Show success message
- `error()` - Show error message
- `warning()` - Show warning message
- `info()` - Show info message

---

## 8. Configuration Requirements

### 8.1 Backend Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pos_system

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

### 8.2 Frontend Configuration

The frontend is configured to make API calls to the backend server. For cloud deployment:
- Update `vite.config.js` with appropriate base URL
- Configure API service to point to production backend

### 8.3 Database Configuration

- MySQL 8.0+ required
- Database name: `pos_system`
- Run `database/schema.sql` to create tables
- Run `database/seed.sql` for initial data

### 8.4 Default Settings

| Setting | Default Value |
|---------|---------------|
| Tax Rate | 10.00% |
| Currency Code | USD |
| Currency Symbol | $ |
| Low Stock Threshold | 10 |
| Invoice Prefix | INV |
| PO Prefix | PO |

---

## 9. Deployment Requirements

### 9.1 Architecture Overview

The system is designed for **cloud-based deployment** without Electron dependencies:

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Infrastructure                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐         ┌─────────────────────────┐  │
│   │   Browser   │────────▶│    Load Balancer       │  │
│   └─────────────┘         └───────────┬─────────────┘  │
│                                       │                 │
│                       ┌───────────────┴───────────────┐ │
│                       ▼                               ▼ │
│              ┌─────────────────┐          ┌────────────┐ │
│              │   Frontend      │          │   Backend  │ │
│              │   (Vite/React)  │◀────────▶│   (Node)   │ │
│              │   Static Host   │          │   API      │ │
│              └─────────────────┘          └─────┬──────┘ │
│                                                 │        │
│                                                 ▼        │
│                                        ┌───────────────┐ │
│                                        │    MySQL      │ │
│                                        │   Database    │ │
│                                        └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Deployment Options

#### Option A: Frontend Static Hosting + Backend API
- **Frontend**: Deploy React build to any static host (Vercel, Netlify, AWS S3+CloudFront)
- **Backend**: Deploy Node.js API to cloud service (Railway, Render, AWS EC2, Heroku)
- **Database**: MySQL managed service (CloudSQL, RDS, PlanetScale)

#### Option B: Containerized Deployment
- Use Docker for both frontend and backend
- Deploy to Kubernetes, Docker Swarm, or cloud container services

### 9.3 Frontend Changes Required

The frontend currently has Electron dependencies that need to be removed for cloud deployment:

1. **Remove Electron-specific files**:
   - `frontend/src/main/` directory (main process)
   - `frontend/src/main/main.js`
   - `frontend/src/main/preload.js`

2. **Update configuration**:
   - Modify `vite.config.js` for cloud deployment
   - Update API service base URL
   - Ensure proper CORS configuration

3. **Update package.json**:
   - Remove Electron-related scripts
   - Ensure standard React build scripts work

### 9.4 Backend Deployment Requirements

1. **Environment Configuration**:
   - Set `NODE_ENV=production`
   - Configure production database connection
   - Set secure JWT secrets
   - Configure production CORS origins

2. **Server Requirements**:
   - Node.js 18+ runtime
   - Process manager (PM2, systemd)
   - SSL/TLS termination (reverse proxy)

3. **Database Requirements**:
   - MySQL 8.0+ with proper credentials
   - Database backup strategy
   - Connection pooling configuration

### 9.5 Security Considerations

1. **Authentication**:
   - Use strong JWT secrets
   - Implement token refresh rotation
   - Secure password hashing (bcrypt)

2. **API Security**:
   - Rate limiting enabled
   - Input validation on all endpoints
   - SQL injection prevention (parameterized queries)

3. **Data Security**:
   - HTTPS/TLS encryption
   - Secure cookie settings
   - CORS configuration

---

## Appendix: Constants Reference

### User Roles
- `admin` - Full system access
- `manager` - Management operations
- `cashier` - Basic sales operations

### Sale Status
- `completed` - Sale completed successfully
- `voided` - Sale voided by manager
- `refunded` - Sale refunded

### Payment Methods
- `cash` - Cash payment
- `card` - Card payment
- `mixed` - Combination of cash and card

### Purchase Order Status
- `pending` - PO created, awaiting approval
- `approved` - PO approved
- `received` - Items received
- `ancelled` - PO cancelled

### Inventory Transaction Types
- `sale` - Inventory decreased by sale
- `purchase` - Inventory increased by PO
- `adjustment` - Manual inventory adjustment
- `return` - Inventory returned

### Stock Status
- `in_stock` - Sufficient stock
- `low_stock` - Below reorder level
- `out_of_stock` - Zero stock

---

*Document Version: 1.0*
*Last Updated: 2026-03-29*
