# POS System

A comprehensive Point of Sale (POS) System featuring a React frontend and Node.js/Express backend with a MySQL database. 

## Live Demo

🚀 Visit Application (Render):
https://pos-system-1-aia1.onrender.com

Backend API (Render):
https://pos-system-x61a.onrender.com

Database Hosting:
The MySQL database is hosted and managed in **Aiven**.

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

## CI/CD Pipeline

This project uses **GitHub Actions** to automate testing and deployment. The pipeline is defined in `.github/workflows/ci-cd.yml`.



### How It Works

This CI/CD pipeline is designed to ensure code quality before pushing it to production on Render.

1. **Triggering the Pipeline (`on:`)**: 
   - The workflow automatically runs every time you push code to the `main` branch or create a pull request targeting `main`.

2. **The Build & Test Job (`build-and-test`)**:
   - Runs on an Ubuntu virtual machine.
   - Checks out the latest code from your repository.
   - Sets up Node.js v20.
   - **Installs dependencies** for the root, frontend, and backend folders.
   - **Lints the backend**: Checks for code formatting or syntax issues if an ESLint configuration file exists.
   - **Tests the backend**: Runs automated tests using `npm test` (passing silently if tests haven't been written yet).
   - **Builds the application**: Compiles the frontend React/Vite application for production.
   - *If any of these steps fail, the pipeline stops and prevents a broken deployment.*

3. **The Deployment Job (`deploy-to-render`)**:
   - Requires the `build-and-test` job to succeed before starting (`needs: build-and-test`).
   - Ensures deployments only happen on direct pushes to `main` (pull requests are tested, but not deployed).
   - Uses `curl` to securely ping **Render Deploy Hooks**, commanding Render to pull the latest code and deploy the backend API and frontend application.

### Required GitHub Secrets
To make the automated deployment work, you must configure the following secrets in your GitHub repository under `Settings > Secrets and variables > Actions`:
- `RENDER_API_DEPLOY_HOOK`: The Deploy Hook URL from your Render Backend Web Service settings.
- `RENDER_FRONTEND_DEPLOY_HOOK`: The Deploy Hook URL from your Render Frontend Static Site settings.

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
