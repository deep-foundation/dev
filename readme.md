# deep-foundation

[![Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deep-foundation/dev) 
[![Discord](https://badgen.net/badge/icon/discord?icon=discord&label&color=purple)](https://discord.gg/deep-foundation)

## Deep Architecture

![IMG_1373](https://github.com/deep-foundation/dev/assets/1431904/8eb44328-5181-43ec-9445-417bbb6cfd83)

## Gitpod usage

### Start

Everything starts automatically. Just watch the terminal.

When all tasks are done, you can open Deep.Case App in browser: http://localhost:3007/ **(ctrl/cmd + click by link)**

It is also possible to open 3007 port manually, to do it open `PORTS` tab and select link for `3007` port.

![image](https://github.com/deep-foundation/dev/assets/1431904/3bb62a4a-4d9f-4612-92c8-a4e9c3404c75)

### Update

GitPod may fail to load prebuild, in that case it is recommended to use these sequence of actions in existing GitPod instance (use GitPod instance multiple times, remember GitPod still may fail):

1. Press `CTRL+C` in `Gitpod Task 2: bash` terminal. Or stop active `npm run gitpod-start` command.
2. Execute 
```
npm run gitpod-update
```
1. Press `↑` in `Gitpod Task 2: bash` terminal and restart `npm run gitpod-start` command.

## Codespaces usage

Everything starts automatically. 

When all tasks are done, you can open Deep.Case App in browser: http://localhost:3007/ **(ctrl/cmd + click by link)**

You may need to [make port](https://docs.github.com/en/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace#sharing-a-port) 3007 public.

![image](https://github.com/CEHR2005/dev/assets/8792220/6157e4c4-ac6a-4ff8-8d13-487737765b7b)

When all tasks are done, you can open Deep.Case App using `PORTS` tab:

![image](https://github.com/CEHR2005/dev/assets/8792220/a45a046c-bec0-473b-8883-3e4e41c4ef83)

## Local usage
### Installation
- Install node 18 (we recommend to use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Install docker and docker-compose  
  If you have Docker Desktop with `docker compose` (not `docker-compose`) you should enable this setting in Docker Desktop:
  ![image](https://github.com/deep-foundation/dev/assets/66206278/a860fef9-0c5b-4569-9a94-0b42257bac42)
  Or use this command (if your are on linux):
  ```bash
  echo 'docker compose --compatibility "$@"' | sudo tee -a /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
  ```
  [Install docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/) or use this commands:
  ```bash
  sudo apt update
  sudo apt install -y git curl docker.io docker-compose
  ```
  Optionally set up docker group and add user to this group (it may be done automatically on installation):
  ```
  sudo groupadd docker
  sudo usermod -aG docker $(whoami)
  ```

  These commands must be able to run without `sudo`, if it is not the case restart computer or relogin as user.
  ```bash
  docker run hello-world
  docker rm $(docker ps -a -q --filter "ancestor=hello-world")
  docker image rm hello-world
  ```

- Run this script to initialize and launch deep
  ```sh
  git clone https://github.com/deep-foundation/dev.git --depth=1
  cd dev
  npm ci
  npm run packages | tee packages.log.txt
  npm run local | tee local.log.txt
  ```
  Run migrations while `npm run local` is executed (for example in separate terminal or `screen`).
  ```
  npm run local-migrate
  ```
### Launch/Restart
```
npm run local
```

### Open

When all tasks are done, you can open Deep.Case App in browser: http://localhost:3007/ (ctrl/cmd + click by link)

## Server usage

### Preparation

Make sure you have virtual machine or server that is connected to the internet.

If you would like to use domain and SSL, make sure:
* DNS server of this domain configurated to point to the public IP of your server;
* HTTP (80) port for cerbot is accessable from the internet to be able to authenticate the domain ownership;
* HTTP (80) and HTTPS (443) porst are accessible from the internet to make nginx work correctly and make the Deep itself accessable.

If you would like to use IP without SSL, make sure:
* Ports 3006 and 3007 are open, for example, using [the ufw package on Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-with-ufw-on-ubuntu-20-04):
  ```
  sudo ufw allow 3006
  sudo ufw allow 3007
  ```

Note that access via IP is not secure (there is no way to issue SSL certificate to IP address), that means it can be only used for development purposes with no sensetive data.


#### Install docker
```bash
sudo apt update
sudo apt install -y git curl docker.io docker-compose
```

#### Add docker group (optional)
Sometimes this action is not done on docker's installation via apt/apt-get or you may need to add access for docker to another user.

```bash
sudo groupadd docker
sudo usermod -aG docker $(whoami)
```

#### Check docker

These commands must be able to run without `sudo`, if it is not the case restart computer or relogin as user.
```bash
docker run hello-world
docker rm $(docker ps -a -q --filter "ancestor=hello-world")
docker image rm hello-world
```

**Continue only if `docker run hello-world` works without `sudo` and errors.**

After docker installation it may be required to move files to another drive (for example on azure VMs).

#### Install nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### Install node

```bash
nvm install 18 && nvm alias default 18 && nvm use default
```

#### Update npm

```bash
npm i -g npm@latest
```

### Installation

#### Configure deep (to support domain with SSL)

```bash
export GQL_SSL="1"
export PROTOCOL="https"
export DEEPCASE_HOST="chatgpt.deep.foundation"
export DEEPLINKS_HOST="deeplinks.chatgpt.deep.foundation"
```

#### Install and configure nginx (to support domain with SSL)

```bash
mkdir nginx
cd nginx
wget https://raw.githubusercontent.com/deep-foundation/dev/main/configure-nginx.js
npm i commander
node configure-nginx.js --configurations "$DEEPCASE_HOST 3007" "$DEEPLINKS_HOST 3006" --certbot-email drakonard@gmail.com
cd ..
```

#### Configure deep (to support IP without SSL)

Do not execute this step if you selected steps for domain with SSL before.

```bash
export GQL_SSL="0"
export PROTOCOL="http"
export HOST_IP="185.105.118.59"
export DEEPCASE_HOST="$HOST_IP:3007"
export DEEPLINKS_HOST="$HOST_IP:3006"
```

#### Install deeplinks global command

```bash
npm rm --unsafe-perm -g @deep-foundation/deeplinks
npm install --unsafe-perm -g @deep-foundation/deeplinks@latest
```

#### Make your Deep instance configurations (aka `call-options.json`)

```bash
export HASURA_ADMIN_SECRET=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));")
export POSTGRES_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));")
export MINIO_ACCESS_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));")
export MINIO_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'));")
tee call-options.json << JSON
{
  "operation": "run",
  "envs": {
    "DEEPLINKS_PUBLIC_URL": "${PROTOCOL}://$DEEPLINKS_HOST",
    "NEXT_PUBLIC_DEEPLINKS_URL": "${PROTOCOL}://$DEEPLINKS_HOST",
    "NEXT_PUBLIC_GQL_PATH": "$DEEPLINKS_HOST/gql",
    "NEXT_PUBLIC_GQL_SSL": "${GQL_SSL}",
    "NEXT_PUBLIC_DEEPLINKS_SERVER": "${PROTOCOL}://$DEEPCASE_HOST",
    "NEXT_PUBLIC_ENGINES_ROUTE": "0",
    "NEXT_PUBLIC_DISABLE_CONNECTOR": "1",
    "JWT_SECRET": "'{\"type\":\"HS256\",\"key\":\"$(node -e "console.log(require('crypto').randomBytes(50).toString('base64'));")\"}'",
    "DEEPLINKS_HASURA_STORAGE_URL": "http://host.docker.internal:8000/",
    "HASURA_GRAPHQL_ADMIN_SECRET": "$HASURA_ADMIN_SECRET",
    "MIGRATIONS_HASURA_SECRET": "$HASURA_ADMIN_SECRET",
    "DEEPLINKS_HASURA_SECRET": "$HASURA_ADMIN_SECRET",
    "POSTGRES_PASSWORD": "$POSTGRES_PASSWORD",
    "HASURA_GRAPHQL_DATABASE_URL": "postgres://postgres:$POSTGRES_PASSWORD@postgres:5432/postgres",
    "POSTGRES_MIGRATIONS_SOURCE": "postgres://postgres:$POSTGRES_PASSWORD@host.docker.internal:5432/postgres?sslmode=disable",
    "RESTORE_VOLUME_FROM_SNAPSHOT": "0",
    "MANUAL_MIGRATIONS": "1",
    "MINIO_ROOT_USER": "$MINIO_ACCESS_KEY",
    "MINIO_ROOT_PASSWORD": "$MINIO_SECRET_KEY",
    "S3_ACCESS_KEY": "$MINIO_ACCESS_KEY",
    "S3_SECRET_KEY": "$MINIO_SECRET_KEY"
  }
}
JSON
```

#### Check that no other deep instances installed at the moment

```bash
docker ps -a
```

On fresh/clean server this list should be empty. If you have any previously installed deep instances, make sure the data is backed up.

#### Install your own deep instance

```bash
export DEEPLINKS_CALL_OPTIONS=$(cat call-options.json)
export DEBUG="deeplinks:engine:*,deeplinks:migrations:*"
deeplinks
```

#### Check that deep instance is installed correctly

```bash
docker ps -a
```

Make sure that all containers have status "Up".

### Restart

#### Entire docker

```bash
sudo systemctl stop docker
sudo systemctl start docker
```

#### Single docker container

```bash
docker restart deep-links
```

### Restore/Update

#### Update deeplinks (optional)

```bash
npm rm --unsafe-perm -g @deep-foundation/deeplinks
npm install --unsafe-perm -g @deep-foundation/deeplinks@latest
```

#### Delete previous versions of docker images (optional)

Sometimes it is not require to delete previous versions of docker images, sometimes this is the only way to make update work.

```bash
docker stop deep-case deep-links
docker rm deep-case deep-links
docker image rm deepf/deeplinks:main
docker image rm deepf/deepcase:main
docker image pull deepf/deepcase:main
docker image pull deepf/deeplinks:main
```

#### Restore/update using installed deeplinks command

```bash
export DEEPLINKS_CALL_OPTIONS=$(cat call-options.json)
export DEBUG="deeplinks:engine:*,deeplinks:migrations:*"
deeplinks
```

### Uninstall

Remove docker containers:

```bash
docker stop $(docker ps -a --format "{{.Names}}" | grep '^deep-.*$')
docker rm $(docker ps -a --format "{{.Names}}" | grep '^deep-.*$')
```

Remove unused volumes (**may destroy you data, it is irreversible operation**, this step is optional):

```bash
docker volume prune -af
```

Remove migrations state (should be executed only if you deleted volumes):

```bash
rm -f /tmp/deep/.migrate
```

Remove `deeplinks` global command:

```bash
npm rm --unsafe-perm -g @deep-foundation/deeplinks
```

## Manual terminal methods

### Docker control

- `npm run docker-deep-start` start all deep docker containers
- `npm run docker-deep-stop` stop all deep docker containers
- `npm run docker-clear` remove (!!WARNING!!) ALL docker containers and volumes in docker

### Gitpod

Automatic

- `npm run gitpod-start` gitpod start u

OR

- `npm run gitpod-local` local launch processes
- `npm run gitpod-recreate` docker/migrations clear/init

Manual

- `npm ci; npm run git-shh-to-https; npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm ci; npm run git-shh-to-https; npm run gitpod` gitpod start up

### Local

Automatic

- `npm run local` local launch processes
- `npm run local-recreate` docker/migrations clear/init

Manual

- `npm ci && npm run packages` before all, only ONCE PER GITPOD CONTAINER!

### Useful

- `npm run rm-migrates` to delete all .migrate artifacts of npm migrate package

### Workspaces

If dependencies are updated in workspaces (`deeplinks`, `deepcase`, `deepcase-app`), we must use these specific commands to make GitPod and GitHub Actions to work correclty in these packages.

If `package.json` and `package-lock.json` was updated in submodule/workspace separately and committed, please make sure you also executed `npm run sync` (which also executes `npm i` in dev repository, and it also commits all changes in all submodules/workspaces), or to test it locally you may use `npm run gitpod-update` command.

- `npm run workspace-install --workspace_arg=deeplinks --package_arg="@deep-foundation/hasura@latest"` to update `hasura` in `deeplinks`.
- `npm run workspace-install --workspace_arg=deeplinks --package_arg="@deep-foundation/npm-packager@latest"` to update `npm-packager` in `deeplinks`.
- `npm run workspace-install --workspace_arg=deepcase --package_arg=emoji-picker-react` to install package in `deepcase` workspace (this command update `package-lock.json` in both `dev` and `package/deepcase` folders).
- `npm run workspace-install --workspace_arg=deepcase --package_arg="@deep-foundation/deeplinks@latest"` to update `deeplinks` in `deepcase`.
- `npm run workspace-install --workspace_arg=deepcase-app --package_arg="@deep-foundation/deepcase@latest"` to update `deepcase` in `deepcase-app`.


## Unsafe gulp methods

- **attention! before work checkout to branch from detached commits in each needed submodule**
- `npm run gulp -- packages:get` clone and install all packages **starts automatically in workspace**
- `(cd packages/hasura && npm run docker-local)` start docker postgres and hasura locally **starts automatically in workspace**
- `npm run gulp -- packages:set` fast git add git commit and git push deepcase repo
- `npm run gulp -- package:insert --url HTTPGITURL --name NAMEINPACKAGESDIRECTORY` insert submodule
- `npm run gulp -- package:delete --name NAMEINPACKAGESDIRECTORY` delete submodule
- `npm run gulp -- assets:update` copy all assets from ./assets in to each package
- `npm run gulp -- packages:sync` sync all dependenced packages in workspace

## Diagnostics

### [Deep.Links](https://github.com/deep-foundation/deeplinks#dignostics)
### [PostgreSQL](https://github.com/deep-foundation/hasura/blob/main/README.md#postgresql)
### [JS Docker Isolation Provider](https://github.com/deep-foundation/js-docker-isolation-provider/blob/main/README.md#diagnostics)
