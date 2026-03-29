/**
 * PM2 Ecosystem Configuration for Cloud Deployment
 * 
 * This configuration manages the POS backend server in production
 * using PM2 process manager for stability, clustering, and monitoring.
 * 
 * Usage:
 *   - Start: npm run pm2:start
 *   - Stop: npm run pm2:stop
 *   - Restart: npm run pm2:restart
 *   - Logs: npm run pm2:logs
 *   - Monitor: npm run pm2:monitor
 *   
 * Direct PM2 commands:
 *   - pm2 start ecosystem.config.js --env production
 *   - pm2 delete all
 *   - pm2 restart ecosystem.config.js
 */

module.exports = {
    apps: [
        {
            // Application name
            name: 'pos-backend',
            
            // Entry point script
            script: './server.js',
            
            // Working directory
            cwd: './',
            
            // Arguments to pass to the script
            args: '',
            
            // Environment variables for production
            env: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            
            // Environment variables for development (use --env dev flag)
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
                LOG_LEVEL: 'info',
                DB_CONNECTION_LIMIT: '20',
                RATE_LIMIT_MAX_REQUESTS: '500'
            },
            
            env_development: {
                NODE_ENV: 'development',
                PORT: 5000,
                LOG_LEVEL: 'debug',
                DB_CONNECTION_LIMIT: '10',
                RATE_LIMIT_MAX_REQUESTS: '1000'
            },
            
            // Number of instances (0 = auto based on CPU cores)
            // Set to 1 for databases that don't support clustering
            instances: 1,
            
            // Enable cluster mode
            exec_mode: 'cluster',
            
            // Cluster coordination (use 'bull' for job queues)
            cluster_type: 'node',
            
            // Auto restart settings
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            
            // Graceful shutdown settings
            kill_timeout: 5000,
            shutdown_with_message: true,
            
            // Source map support for error tracking
            source_map_support: true,
            
            // PM2 Plus monitoring (optional - remove if not using)
            // To enable: signup at https://keymetrics.io/
            // instance_var: 'INSTANCE_ID',
            
            // Logging configuration
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,
            
            // Error log file (relative to cwd)
            error_file: './logs/pm2-error.log',
            
            // Output log file (relative to cwd)
            out_file: './logs/pm2-out.log',
            
            // Combined log file
            log_file: './logs/pm2-combined.log',
            
            // Access log (enable only if needed, can be large)
            // access_file: './logs/pm2-access.log',
            
            // Time before killing the app (grace period)
            kill_timeout: 8000,
            
            // Restart delay (milliseconds)
            restart_delay: 4000,
            
            // Maximum restarts in a minute
            max_restarts: 10,
            min_uptime: '10s',
            
            // Retry failed restart attempts
            backoff_restart: true,
            backoff_delay: 1000,
            
            // Development specific
            // restart_delay: 1000,
            
            // Production optimizations
            node_args: '--max-old-space-size=1024 --expose-gc',
            
            // Health check endpoint (optional)
            // health_check: './api/health',
            // health_timeout: 3000,
            
            // Process status on PM2 start
            kill_retry: true,
            
            // Acts like keep-alive (ping every 45 seconds)
            // Useful for preventing idle timeouts in cloud platforms
            pmx: true,
            
            // Inter-process communication
            // instance_id: process.env.INSTANCE_ID || 'pos-backend-1'
        }
    ],
    
    // Deployment configuration (for PM2 Plus and remote deployments)
    deploy: {
        production: {
            user: 'node',
            host: process.env.DEPLOY_HOST || 'your-server.com',
            port: process.env.DEPLOY_SSH_PORT || 22,
            ref: 'origin/main',
            repo: process.env.GIT_REPO || 'git@github.com:your-repo.git',
            path: '/var/www/pos-backend',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && npm run pm2:restart',
            'pre-setup': ''
        }
    }
};

/*
 * PM2 Plus Dashboard Integration
 * 
 * To monitor your application with PM2 Plus:
 * 1. Create account at https://keymetrics.io/
 * 2. Get your public key and secret key
 * 3. Add to ecosystem.config.js:
 * 
 *   pm2: {
 *     public_key: 'your-public-key',
 *     secret_key: 'your-secret-key',
 *     name: 'pos-backend',
 *     server: {
 *       host: 'eu1.keymetrics.io',
 *       port: 443,
 *       key: 'path/to/ssl/cert.pem'
 *     }
 *   }
 * 
 * Or use environment variables:
 *   - PM2_PUBLIC_KEY
 *   - PM2_SECRET_KEY
 *   - PM2_MACHINE_NAME
 */

/*
 * Docker/Container Deployment Notes:
 * 
 * When deploying in containers (Docker, Kubernetes, etc.):
 * 1. Set instances to 1 (one process per container)
 * 2. Use health checks for container orchestration
 * 3. Set NODE_ENV=production
 * 4. Configure appropriate memory limits (--max-old-space-size)
 * 
 * Example Docker CMD:
 *   CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
 * 
 * Example Kubernetes liveness/readiness probes:
 *   livenessProbe:
 *     httpGet:
 *       path: /api/health
 *       port: 5000
 *     initialDelaySeconds: 30
 *     periodSeconds: 10
 */

/*
 * Cloud Platform Specific Configuration:
 * 
 * AWS Elastic Beanstalk:
 *   - Use EB CLI or .ebextensions
 *   - Set PORT in Dockerrun.aws.json
 *   - Use application ELB for load balancing
 * 
 * Heroku:
 *   - Use web: npm start
 *   - Set NODE_ENV=production
 *   - Use Procfile for custom start
 * 
 * Railway/Render:
 *   - Set start command: npm run pm2:start
 *   - Environment variables in dashboard
 *   - Automatic SSL handling
 * 
 * Fly.io:
 *   - Use fly launch
 *   - Set PORT in fly.toml
 *   - Use fly logs for monitoring
 */