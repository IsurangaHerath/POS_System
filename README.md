# POS System

A comprehensive Point of Sale (POS) System featuring a React frontend and Node.js/Express backend with a MySQL database. 

## Live Demo

🚀 Visit Application:
https://pos-system-1-aia1.onrender.com

Backend API:
https://pos-system-x61a.onrender.com

## Quick Start Guide

### Prerequisites
1. **Node.js** (version 18 or higher)
2. **MySQL** (version 8.0 or higher)

### Step 1: Set Up the Database

1. Open MySQL Workbench or Command Line.
2. Create the Database:
   ```sql
   CREATE DATABASE pos_system;
   USE pos_system;
   ```
3. Run the SQL schema script located in `database/schema.sql`:
   ```bash
   mysql -u root -p pos_system < database/schema.sql
   ```
4. Insert Sample Data using `database/seed.sql`.

### Step 2: Set Up the Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment: Create a `.env` file in the `backend` folder based on `.env.example`.
4. Start the server:
   ```bash
   npm run dev
   ```

### Step 3: Set Up the Frontend

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm run dev
   ```

### Step 4: Login to the Application

Once the application opens (usually at http://localhost:5173), you can register a new user or login.

## Project Structure Overview

```text
project-root
│
├── frontend          # React App
│   ├── src
│   ├── public
│   └── package.json
│
├── backend           # Node.js API Server
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   ├── middleware
│   │   └── config
│   └── package.json
│
├── database          # SQL Scripts for schema and seed data
└── README.md
```
