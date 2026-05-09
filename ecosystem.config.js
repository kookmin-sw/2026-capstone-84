module.exports = {
  apps: [{
    name: 'book-discussion',
    script: 'server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_file: 'server/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
