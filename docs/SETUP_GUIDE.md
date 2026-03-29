# POS System - Setup Guide

Complete step-by-step instructions to set up and run the Point of Sale system.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.x or higher | JavaScript runtime |
| npm | 9.x or higher | Package manager |
| MySQL | 8.0 or higher | Database |
| Git | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| VS Code | Code editor |
| Postman | API testing |
| MySQL Workbench | Database management |

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check MySQL version
mysql --version
# Expected: mysql Ver 8.0.x

# Check Git
git --version
```

---

## Project Structure

After setup, your project will have this structure:

```
POS/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   ├── package.json
│   └── .env
├── frontend/                # Electron + React application
│   ├── src/
│   ├── package.json
│   └── .env
├── database/                # Database scripts
│   ├── SQL_SCHEMA.md
│   ├── SEED_DATA.md
│   └── er_diagram.md
├── docs/                    # Documentation
│   ├── API_DOCUMENTATION.md
│   └── SETUP_GUIDE.md
└── plans/                   # Architecture documents
    └── POS-System-Architecture.md
```

---

## Database Setup

### Step 1: Start MySQL Server

**Windows:**
```bash
# Start MySQL service
net start mysql80

# Or via Services app (services.msc)
```

**macOS:**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
```

### Step 2: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional, recommended for production)
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON pos_system.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### Step 3: Run Schema Scripts

Execute the SQL scripts from `database/SQL_SCHEMA.md` in order:

```bash
# Option 1: Using MySQL command line
mysql -u root -p pos_system < database/schema.sql

# Option 2: Using MySQL Workbench
# Open MySQL Workbench, connect to pos_system database
# Open and execute each CREATE TABLE statement
```

### Step 4: Insert Seed Data

```bash
# Insert seed data for testing
mysql -u root -p pos_system < database/seeds.sql
```

### Step 5: Verify Database

```sql
-- Connect to database
USE pos_system;

-- Check tables
SHOW TABLES;

-- Verify users table
SELECT * FROM users;

-- Verify products
SELECT COUNT(*) FROM products;
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected dependencies:**
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-validator": "^7.0.1",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.6.5",
    "pdfkit": "^0.14.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### Step 3: Create Environment File

Create `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pos_system
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application Settings
APP_NAME=POS System
APP_URL=http://localhost:5000
```

### Step 4: Verify Backend Setup

```bash
# Start development server
npm run dev

# Expected output:
# Server running on port 5000
# Database connected successfully
```

Test the API:
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"success":true,"message":"Server is running","timestamp":"..."}
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

**Expected dependencies:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "axios": "^1.6.2",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "tailwindcss": "^3.3.6",
    "@headlessui/react": "^1.7.17",
    "react-icons": "^4.12.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.7",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### Step 3: Create Environment File

Create `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Application Settings
VITE_APP_NAME=POS System
```

### Step 4: Configure Tailwind CSS

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
```

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 5: Verify Frontend Setup

```bash
# Start development server (React only)
npm run dev

# Expected output:
# VITE v5.0.7 ready in 500 ms
# ➜ Local: http://localhost:5173/
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Electron (optional):**
```bash
npm run dev
```

This starts the Vite development server.

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend (build and run):**
```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/` directory. Serve with any static file server.

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/new-feature
```

### 2. Make Changes

- Backend: Edit files in `backend/src/`
- Frontend: Edit files in `frontend/src/`

### 3. Test Changes

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/new-feature
```

---

## Production Deployment

### Backend Deployment

#### Option 1: Traditional Server

1. **Prepare for Production:**
```bash
cd backend
npm ci --only=production
```

2. **Set Environment Variables:**
```env
NODE_ENV=production
PORT=5000
# ... other production values
```

3. **Use Process Manager:**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name pos-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t pos-backend .
docker run -p 5000:5000 pos-backend
```

### Frontend Deployment

#### Build Electron Application

```bash
cd frontend

# Build for current platform
npm run build

# Note: No Electron build needed - this is a web application.
```

Output will be in `frontend/dist/` directory.

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `ER_ACCESS_DENIED_ERROR: Access denied for user`

**Solution:**
```bash
# Verify MySQL is running
mysql -u root -p

# Check credentials in .env file
# Reset MySQL password if needed
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### 2. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::5000`

**Solution:**
```bash
# Find process using port
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

#### 3. JWT Token Invalid

**Error:** `JsonWebTokenError: invalid signature`

**Solution:**
- Ensure JWT_SECRET is the same across all instances
- Check token expiration
- Clear localStorage and re-login

#### 4. Module Not Found

**Error:** `Module not found`

**Solution:**
```bash
# Verify all dependencies are installed
cd backend && npm install
cd ../frontend && npm install
```

#### 5. CORS Error

**Error:** `Access-Control-Allow-Origin`

**Solution:**
- Check CORS configuration in backend
- Ensure frontend URL is in allowed origins

```javascript
// backend/src/app.js
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
```

### Logs Location

- **Backend logs:** `backend/logs/`
- **Electron logs:** 
  - Windows: `%USERPROFILE%\AppData\Roaming\pos-system\logs\`
  - macOS: `~/Library/Logs/pos-system/`
  - Linux: `~/.config/pos-system/logs/`

### Getting Help

1. Check the documentation in `docs/`
2. Review API documentation at `docs/API_DOCUMENTATION.md`
3. Check database schema at `database/er_diagram.md`
4. Review architecture at `plans/POS-System-Architecture.md`

---

## Quick Start Commands

```bash
# Clone repository (if applicable)
git clone <repository-url>
cd POS

# Setup database
mysql -u root -p -e "CREATE DATABASE pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p pos_system < database/schema.sql
mysql -u root -p pos_system < database/seeds.sql

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev

# Setup frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev

# Open browser to http://localhost:5173
# Login with: admin / password123
```

---

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Admin |
| manager1 | password123 | Manager |
| cashier1 | password123 | Cashier |

---

*Document Version: 1.0*
*Last Updated: February 2026*
