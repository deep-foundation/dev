const { spawn } = require('child_process');

const execCommand = async (command) => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const childProcess = spawn(cmd, args);

    childProcess.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    childProcess.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    childProcess.on('error', (error) => {
      reject(error);
    });

    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
  });
};


(async () => {
  try {
    console.log('Install docker and docker-compose...');
    // For Ubuntu, you can use these commands to install docker and docker-compose
    await execCommand('sudo apt-get update');
    await execCommand('sudo apt-get install -y docker.io docker-compose');
    
    console.log('Install dependencies...');
    await execCommand('npm ci && npm run packages');

    console.log('Start the local server...');
    const startLocal = execCommand('npm run local');

    console.log('Wait for local server to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Run local migrations...');
    await execCommand(`npm run local-migrate`);

    console.log('Rejoin local server logs...');
    await startLocal;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();