module.exports = {
  apps: [
    {
      name: 'exit-system',
      script: 'npx',
      args: 'wrangler pages dev dist --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CLOUDFLARE_API_TOKEN: 'suBVZRmBzUt7luzRSGUiii-n98GQwDgBadrfc3ST'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      autorestart: false,
      max_restarts: 3,
      min_uptime: '10s'
    }
  ]
}
