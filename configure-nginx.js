const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { spawn } = require('child_process');

// Read command line arguments
const [, , ...args] = process.argv;

const options = {};
for (let i = 0; i < args.length - 1; i += 2) {
  options[args[i]] = args[i + 1];
}

const deepcaseDomain = options['--deepcase-domain'];
const deeplinksDomain = options['--deeplinks-domain'];
const certbotEmail = options['--certbot-email'];

if (!deepcaseDomain || !deeplinksDomain || !certbotEmail) {
  console.error('Error: Missing required options');
  console.log('Usage: node configure-nginx.js --deepcase-domain chatgpt.deep.foundation --deeplinks-domain deeplinks.chatgpt.deep.foundation --certbot-email your@email.com');
  process.exit(1);
}

const configWithoutCertificates = `
map $http_upgrade $connection_upgrade {  
  default upgrade;
  ''      close;
}

server {
  charset utf-8;
  listen 80;
  server_name ${deepcaseDomain};

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:3007;
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
}

server {
  charset utf-8;
  listen 80;
  server_name ${deeplinksDomain};

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:3006;
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
}
`;

const configWithCertificates = `
map $http_upgrade $connection_upgrade {  
  default upgrade;
  ''      close;
}

server {
  charset utf-8;
  listen 80;
  listen 443 ssl;
  server_name ${deepcaseDomain};
  ssl_certificate         /etc/letsencrypt/live/${deepcaseDomain}/fullchain.pem;
  ssl_certificate_key     /etc/letsencrypt/live/${deepcaseDomain}/privkey.pem;
  ssl_trusted_certificate /etc/letsencrypt/live/${deepcaseDomain}/chain.pem;

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:3007;
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
}

server {
  charset utf-8;
  listen 80;
  listen 443 ssl;
  server_name ${deeplinksDomain};
  ssl_certificate         /etc/letsencrypt/live/${deeplinksDomain}/fullchain.pem;
  ssl_certificate_key     /etc/letsencrypt/live/${deeplinksDomain}/privkey.pem;
  ssl_trusted_certificate /etc/letsencrypt/live/${deeplinksDomain}/chain.pem;

  location / {
      proxy_http_version 1.1;
      proxy_pass http://127.0.0.1:3006;
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
}
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

    fs.writeFileSync(`/etc/nginx/sites-available/deep`, configWithoutCertificates);
    await execCommand(`sudo ln -sf /etc/nginx/sites-available/deep /etc/nginx/sites-enabled/`);

    await execCommand('sudo nginx -t');

    await execCommand('sudo systemctl restart nginx');

    await execCommand(`sudo certbot certonly --webroot --webroot-path=/var/www/html -d ${deepcaseDomain} -n --agree-tos -m ${certbotEmail}`);
    await execCommand(`sudo certbot certonly --webroot --webroot-path=/var/www/html -d ${deeplinksDomain} -n --agree-tos -m ${certbotEmail}`);

    fs.writeFileSync(`/etc/nginx/sites-available/deep`, configWithCertificates);

    await execCommand('sudo nginx -t');

    await execCommand('sudo systemctl restart nginx');
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();
