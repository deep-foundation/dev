const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const execCommand = async (command) => {
  const { stdout, stderr } = await execAsync(command);
  console.log(stdout);
  console.error(stderr);

  // process.stdin.on("data", data => {
  //   data = data.toString().toUpperCase()
  //   process.stdout.write(data + "\n")
  // })
};

(async () => {
  try {
    console.log('Install nvm to manage Node.js versions...');
    await execCommand('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash');
    
    console.log('Activate nvm...');
    const activateNvm = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\ . "$NVM_DIR/nvm.sh"';
    await execCommand(activateNvm);
    
    console.log('Install and use Node v14.21.3...');
    await execCommand(`${activateNvm} && nvm install v14.21.3 && nvm use v14.21.3`);
    
    console.log('Install docker and docker-compose...');
    // For Ubuntu, you can use these commands to install docker and docker-compose
    await execCommand('sudo apt-get update');
    await execCommand('sudo apt-get install -y docker.io docker-compose');
    
    console.log('Install dependencies...');
    await execCommand('npm ci && npm run packages');

    console.log('Start the local server...');
    const startLocal = execCommand('cd dev && npm run local');

    console.log('Wait for local server to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Run local migrations...');
    await execCommand(`cd dev && npm run local-migrate`);

    console.log('Rejoin local server logs...');
    await startLocal;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();