# POS System - Cloud Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the POS system to various cloud platforms. The system consists of two main components:

- **Backend**: Node.js/Express API server (Port 5000)
- **Frontend**: React/Vite web application

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [PM2 Setup for Production](#pm2-setup-for-production)
4. [Cloud Platform Deployment](#cloud-platform-deployment)
   - [AWS EC2](#aws-ec2)
   - [DigitalOcean](#digitalocean)
   - [Railway](#railway)
   - [Render](#render)
   - [Vercel (Frontend Only)](#vercel-frontend-only)
5. [Database Setup](#database-setup)
6. [SSL Configuration](#ssl-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- Node.js 18+ (LTS recommended)
- MySQL 8.0+ (or cloud database)
- PM2 (for production process management)
- Git

### System Requirements

- 2GB RAM minimum (4GB recommended)
- 20GB storage minimum
- Ubuntu 20.04+ / Debian 11+ / macOS / Windows Server 2019+

---

## Environment Configuration

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```env
# =============================================
# SERVER CONFIGURATION
# =============================================
NODE_ENV=production
PORT=5000

# Domain for CORS (update for production)
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com

# =============================================
# DATABASE CONFIGURATION
# =============================================
DB_HOST=your-mysql-host.com
DB_PORT=3306
DB_NAME=pos_system
DB_USER=pos_user
DB_PASSWORD=your_secure_password
DB_CONNECTION_LIMIT=20

# SSL for cloud databases
DB_SSL=true

# =============================================
# JWT CONFIGURATION
# =============================================
JWT_SECRET=your-very-long-and-secure-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# =============================================
# SECURITY & RATE LIMITING
# =============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500

# =============================================
# LOGGING
# =============================================
LOG_LEVEL=info
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# API Configuration
VITE_API_URL=https://your-api-domain.com/api
VITE_APP_NAME=POS System
```

For production builds, you may need to create `.env.production`:

```env
VITE_API_URL=https://your-api-domain.com/api
```

---

## PM2 Setup for Production

PM2 is recommended for production deployment as it provides:

- Process monitoring and auto-restart
- Log management
- Cluster mode for load balancing
- Zero-downtime deployments

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Navigate to backend directory
cd backend

# Start the application
pm2 start ecosystem.config.js --env production

# Save process list for auto-restart
pm2 save

# Setup startup script (run on system boot)
pm2 startup
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Stop application
pm2 stop ecosystem.config.js

# Restart application
pm2 restart ecosystem.config.js

# View logs
pm2 logs

# View status
pm2 status

# Monitor resources
pm2 monit

# Clear logs
pm2 flush

# Delete all processes
pm2 delete all
```

### Ecosystem Configuration

The `ecosystem.config.js` file in the backend directory is pre-configured with:

- Single instance mode (for databases without clustering support)
- Auto-restart on failure
- Log rotation
- Memory limit (1GB)
- Graceful shutdown

---

## Cloud Platform Deployment

### AWS EC2

#### 1. Launch Instance

1. Go to AWS EC2 Console
2. Launch instance with Ubuntu 20.04 LTS
3. Select t3.medium (or larger for production)
4. Configure security group:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 5000 (API - optional, can use reverse proxy)

#### 2. SSH and Setup

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install PM2
sudo npm install -g pm2
```

#### 3. Deploy Application

```bash
# Clone repository
git clone https://your-repo-url.git
cd POS

# Install backend dependencies
cd backend
npm install --production

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with production values

# Setup MySQL database
sudo mysql
CREATE DATABASE pos_system;
CREATE USER 'pos_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON pos_system.* TO 'pos_user'@'%';
FLUSH PRIVILEGES;
EXIT;

# Import database schema
mysql -u pos_user -p pos_system < ../database/schema.sql
mysql -u pos_user -p pos_system < ../database/seed.sql

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 4. Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create configuration
sudo nano /etc/nginx/sites-available/pos-system
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (Static files)
    location / {
        root /home/ubuntu/POS/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### DigitalOcean

#### 1. Create Droplet

1. Create new Droplet
2. Select: Ubuntu 22.04 LTS
3. Choose size: 4GB/2vCPU (or larger)
4. Add SSH key

#### 2. Initial Setup

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Create user
adduser posadmin
usermod -aG sudo posadmin
su - posadmin

# Install dependencies
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs mysql-server nginx

# Install PM2 globally
sudo npm install -g pm2
```

#### 3. Deploy (Same as AWS EC2 from step 3)

---

### Railway

Railway provides automatic deployments with built-in database support.

#### 1. Setup

1. Go to [Railway.app](https://railway.app)
2. Connect GitHub repository
3. Add New Project > Deploy from GitHub

#### 2. Configure

1. Add MySQL database (Railway provides managed MySQL)
2. Set environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DB_HOST` (from Railway MySQL connection)
   - `DB_PORT=3306`
   - `DB_NAME=railway`
   - `DB_USER` (from Railway MySQL connection)
   - `DB_PASSWORD` (from Railway MySQL connection)
   - `JWT_SECRET=your-secure-secret`
   - `FRONTEND_URL=https://your-app.railway.app`
   - `ALLOWED_ORIGINS=https://your-app.railway.app`

#### 3. Deploy Backend

1. Set root directory to `backend`
2. Railway will auto-detect Node.js
3. Add start command: `npm start`

#### 4. Deploy Frontend (Optional)

For frontend, either:
- Deploy separately to Vercel/Netlify
- Or add as separate Railway service

---

### Render

#### 1. Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create Web Service
3. Connect GitHub repository

#### 2. Configure Backend

| Setting | Value |
|---------|-------|
| Name | pos-api |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Starter (or Professional for production) |

#### 3. Environment Variables

Add all required environment variables:
- `NODE_ENV=production`
- `PORT=5000`
- `DB_HOST` (managed database host)
- `DB_PORT=3306`
- `DB_NAME=pos_system`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL` (your frontend URL)
- `ALLOWED_ORIGINS`

#### 4. Database

Create managed MySQL:
1. Create New > PostgreSQL/MySQL
2. Copy connection details to environment variables

---

### Vercel (Frontend Only)

#### 1. Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel
```

#### 2. Environment Variables

In Vercel Dashboard, add:
- `VITE_API_URL=https://your-api-domain.com/api`

#### 3. Configuration (vercel.json)

Create `vercel.json` in frontend directory:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend-domain.com/api/:splat" }
  ]
}
```

---

## Database Setup

### Local MySQL Setup

```bash
# Install MySQL
sudo apt update
sudo apt install -y mysql-server

# Secure installation
sudo mysql_secure_installation

# Create database and user
sudo mysql
```

```sql
CREATE DATABASE pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON pos_system.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Cloud Database Options

1. **AWS RDS**: MySQL 8.0 compatible
2. **DigitalOcean Managed Databases**: MySQL 8.0
3. **PlanetScale**: Serverless MySQL (requires connection adapter)
4. **Clever Cloud**: MySQL add-on
5. **Railway**: Managed MySQL

### Import Schema

```bash
# From project root
mysql -u pos_user -p pos_system < database/schema.sql

# Import seed data (optional)
mysql -u pos_user -p pos_system < database/seed.sql
```

---

## SSL Configuration

### With Nginx (Self-hosted)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (automatic)
sudo systemctl status certbot.timer
```

### Cloud Platforms

Most cloud platforms provide automatic SSL:

- **Railway**: Automatic HTTPS
- **Render**: Automatic HTTPS
- **Vercel**: Automatic HTTPS
- **AWS**: Use ACM for Certificate Manager

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# Real-time logs
pm2 logs

# Dashboard
pm2 monit

# View all processes
pm2 list

# Restart specific process
pm2 restart pos-backend
```

### Application Logs

Logs are stored in:
- `backend/logs/pm2-error.log`
- `backend/logs/pm2-out.log`
- `backend/logs/pm2-combined.log`

### Health Check Endpoint

```bash
curl https://your-api-domain.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400
}
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u pos_user -p -h localhost pos_system

# Check firewall
sudo ufw allow 3306
```

#### 2. Port Already in Use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

#### 3. CORS Errors

Check `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

#### 4. JWT Token Expired

- Check server time sync: `timedatectl`
- Verify `JWT_EXPIRES_IN` in `.env`
- Clear browser localStorage and re-login

#### 5. Memory Issues

```bash
# Check memory usage
free -h

# PM2 memory-based auto-restart is enabled (1G limit)
# Monitor with: pm2 monit
```

### Health Check

Test deployment health:

```bash
# Backend health
curl https://your-api-domain.com/api/health

# Database connection (requires auth token)
curl https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

---

## Security Checklist

- [ ] Change default `JWT_SECRET`
- [ ] Use strong database passwords
- [ ] Enable SSL/HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS`
- [ ] Enable rate limiting
- [ ] Setup firewall (ufw)
- [ ] Regular backups of database
- [ ] Keep Node.js updated

---

## Backup & Recovery

### Database Backup

```bash
# Backup
mysqldump -u pos_user -p pos_system > backup_$(date +%Y%m%d).sql

# Restore
mysql -u pos_user -p pos_system < backup_20240115.sql
```

### PM2 Save State

```bash
# Save current process list
pm2 save

# This restores on system reboot after pm2 startup
```

---

## Support

For issues, check:

1. `pm2 logs` for application errors
2. MySQL logs: `/var/log/mysql/error.log`
3. Nginx logs: `/var/log/nginx/error.log`
4. System logs: `journalctl -xe`