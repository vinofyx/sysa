// ==============================================================================
// Sai Yadadri Seva Ashram Platform — PM2 Process Manager Configuration
//
// Used for direct-VPS deployment (non-Docker path) or for running the API
// under a persistent process manager inside the Docker runtime container.
// See design/15-Deployment-Architecture.md §2 for the deployment topology.
//
// Usage:
//   pm2 start infrastructure/pm2/ecosystem.config.js --env production
//   pm2 logs sysa-api
//   pm2 reload sysa-api   # zero-downtime reload
// ==============================================================================

module.exports = {
  apps: [
    {
      name: 'sysa-api',
      cwd: '../../apps/api',
      script: 'dist/server.js',
      instances: process.env.PM2_API_INSTANCES || 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '../../apps/api/logs/pm2-error.log',
      out_file: '../../apps/api/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      // If deploying the Next.js `output: 'standalone'` build (see apps/web/Dockerfile),
      // point `script` at `.next/standalone/apps/web/server.js` instead and drop `args`.
      name: 'sysa-web',
      cwd: '../../apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: process.env.PM2_WEB_INSTANCES || 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '../../apps/web/logs/pm2-error.log',
      out_file: '../../apps/web/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
