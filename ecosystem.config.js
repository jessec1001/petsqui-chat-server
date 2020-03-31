module.exports = {
  apps : [{
    name: 'API',
    script: 'app.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: 'one two',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
  deploy: {
    production: {
      user: 'ec2-user',
      host: 'ec2-54-244-141-144.us-west-2.compute.amazonaws.com',
      // key: './.ssh/phil.pem',
      ref: 'origin/master',
      repo: 'git@gitlab.com:vividunity/petsqui-chat-server.git',
      path: '/home/ec2-user/chat-backend',
      'post-deploy': 'npm install && npm build && pm2 startOrRestart ecosystem.config.js'
    }
  }
};
