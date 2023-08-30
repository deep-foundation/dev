const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { spawn } = require('child_process');
const { program } = require('commander');

// Usage: node configure-nginx-multiple-configurations.js --configurations "deep.deep.foundation 3007" "deeplinks.deep.foundation 3006" "hasura.deep.foundation 8080" --certbot-email drakonard@gmail.com

program
  .option('-c, --configurations <configurations...>', 'specify configurations')
  .option('-e, --certbot-email <cerbot-email>', 'specify certbot email');
program.parse();
const options = program.opts();

const configurations = options.configurations.map(c => {
  const parts = c.split(' ');
  return {
    domain: parts[0],
    port: parts[1]
  }
});
const certbotEmail = options.certbotEmail;

const configWithoutCertificates = (configurations) => `
map $http_upgrade $connection_upgrade {  
  default upgrade;
  ''      close;
}
${configurations.map(c => `

server {
  charset utf-8;
  listen 80;
  server_name ${c.domain};

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:${c.port};
      proxy_set_header Host $host;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Real-IP $remote_addr;
  }

  # ACME challenge
  location ^~ /.well-known {
      alias           /var/www/html/.well-known/;
      default_type    "text/plain";
      try_files       $uri =404;
  }
}`).join('')}

`;

const configWithCertificates = (configurations) => `
map $http_upgrade $connection_upgrade {  
  default upgrade;
  ''      close;
}
${configurations.map(c => `

server {
  listen 80;

  server_name ${c.domain};

  return 301 https://$host$request_uri;
}

server {
  charset utf-8;
  listen 443 ssl;
  server_name ${c.domain};
  ssl_certificate         /etc/letsencrypt/live/${c.domain}/fullchain.pem;
  ssl_certificate_key     /etc/letsencrypt/live/${c.domain}/privkey.pem;
  ssl_trusted_certificate /etc/letsencrypt/live/${c.domain}/chain.pem;

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:${c.port};
      proxy_set_header Host $host;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Real-IP $remote_addr;
  }

  # ACME challenge
  location ^~ /.well-known {
      alias           /var/www/html/.well-known/;
      default_type    "text/plain";
      try_files       $uri =404;
  }
}`).join('')}

`;

const execCommand = async (command) => {
  console.log('Executing:', command, '...');
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, { 
      stdio: 'inherit',
      shell: true
    });
    childProcess.on('error', (error) => {
      reject(error);
    });
    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}.`));
      }
    });
  });
};

(async () => {
  try {
    await execCommand('sudo apt-get update && sudo apt-get install -y nginx certbot');

    await execCommand('sudo touch /etc/nginx/sites-available/deep');
    await execCommand('sudo chmod 777 /etc/nginx/sites-available/deep');

    fs.writeFileSync(`/etc/nginx/sites-available/deep`, configWithoutCertificates(configurations));
    
    await execCommand(`sudo ln -sf /etc/nginx/sites-available/deep /etc/nginx/sites-enabled/`);

    await execCommand('sudo nginx -t');

    await execCommand('sudo systemctl restart nginx');

    for (const configuration of configurations) {
      await execCommand(`sudo certbot certonly --webroot --webroot-path=/var/www/html -d ${configuration.domain} -n --agree-tos -m ${certbotEmail}`);
    }

    fs.writeFileSync(`/etc/nginx/sites-available/deep`, configWithCertificates(configurations));

    await execCommand('sudo nginx -t');

    await execCommand('sudo systemctl restart nginx');
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();
