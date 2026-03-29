# Quick Start Guide - POS System

## Step-by-Step Instructions to Run the POS System

### Prerequisites

Before starting, make sure you have the following installed:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: Open terminal and run `node --version`

2. **MySQL** (version 8.0 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Make sure MySQL service is running

3. **A code editor** (VS Code recommended)
   - Download from: https://code.visualstudio.com/

---

## Step 1: Set Up the Database

### 1.1 Open MySQL Workbench or Command Line

```bash
# Login to MySQL
mysql -u root -p
```

### 1.2 Create the Database

```sql
CREATE DATABASE pos_system;
USE pos_system;
```

### 1.3 Create Tables

Copy and paste the SQL from `database/SQL_SCHEMA.md` into your MySQL client and execute it.

Or run via command line:
```bash
mysql -u root -p pos_system < database/schema.sql
```

### 1.4 Insert Sample Data

Copy and paste the SQL from `database/SEED_DATA.md` to add demo data.

---

## Step 2: Set Up the Backend

### 2.1 Open Terminal in Project Folder

```bash
# Navigate to the backend folder
cd c:/Users/CNN COMPUTERS/Desktop/POS/backend
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Configure Environment

Create a `.env` file in the `backend` folder:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pos_system

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# App
APP_NAME=POS System
```

**Important**: Replace `your_mysql_password` with your actual MySQL root password.

### 2.4 Start the Backend Server

```bash
npm run dev
```

You should see:
```
Server running on port 5000
Database connected successfully
```

---

## Step 3: Set Up the Frontend

### 3.1 Open a New Terminal

```bash
# Navigate to the frontend folder
cd c:/Users/CNN COMPUTERS/Desktop/POS/frontend
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Start the Application

For development:
```bash
npm run dev
```

This will start the Vite development server.

---

## Step 4: Login to the Application

Once the application opens, you can login with these demo credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Cashier | cashier | cashier123 |

---

## Alternative: Run Frontend Only (Web Browser)

If you want to test just the React frontend in a browser:

```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

**Note**: The backend must be running for the frontend to work.

---

## Troubleshooting

### "Cannot connect to database"
- Make sure MySQL is running
- Check your `.env` file has correct database credentials
- Verify the database `pos_system` exists

### "Port 5000 already in use"
- Change the PORT in `.env` file
- Or kill the process using port 5000

### "Module not found" errors
- Run `npm install` again in both backend and frontend folders
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Frontend window doesn't open
- Check terminal for errors
- Make sure port 5173 is not blocked
- Verify all dependencies are installed with `npm install`

---

## Project Structure Overview

```
POS/
├── backend/          # API Server (Port 5000)
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── controllers/  # Business logic
│   │   └── models/   # Database models
│   └── server.js     # Start here
│
├── frontend/         # Electron + React App
│   ├── src/
│   │   ├── main/     # Electron main process
│   │   └── renderer/ # React UI
│   └── package.json
│
├── database/         # SQL Scripts
│   ├── SQL_SCHEMA.md # Run this first
│   └── SEED_DATA.md  # Run this second
│
└── docs/             # Documentation
```

---

## Quick Commands Summary

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## Need Help?

1. Check the full documentation in `docs/SETUP_GUIDE.md`
2. Check API documentation in `docs/API_DOCUMENTATION.md`
3. Review the system documentation in `SYSTEM.md`
