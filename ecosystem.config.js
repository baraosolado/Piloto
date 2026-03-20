/**
 * PM2 — produção no VPS
 * Uso: pm2 start ecosystem.config.js --env production
 *      pm2 reload piloto --update-env
 */
module.exports = {
  apps: [
    {
      name: "piloto",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
