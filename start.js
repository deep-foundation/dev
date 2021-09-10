const { spawn, exec } = require('child_process');
exec("export HASURA_GRAPHQL_DATABASE_URL=$DATABASE_URL");
const gql = spawn('graphql-engine', ['serve']);
const deeplinksApp = spawn('npm', ['run', 'deeplinks-app']);
let migrations;
console.log(`Hello bugfixers! This hasura wrapped by menzorg@deep.foundation`);
gql.stdout.on('data', (data) => {
  console.log(`{ "logtype": "hasura", "log": ${data}`);
});

gql.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

gql.on('close', (code) => {
  console.log(`gql exited with code ${code}`);
});

deeplinksApp.stdout.on('data', (data) => {
 console.log(`{ "logtype": "app", "log": ${data}`);
});

deeplinksApp.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

deeplinksApp.on('close', (code) => {
  console.log(`deeplinksApp exited with code ${code}`);
});

setTimeout(()=>{
  migrations = = spawn('npm', ['run', 'deeplinks']});
  migrations.stdout.on('data', (data) => {
   console.log(`{ "logtype": "migrations", "log": "${data}""`);
  });
  migrations.on('close', (code) => {
    console.log(`migrations exited with code ${code}`);
  });
}, 10000);