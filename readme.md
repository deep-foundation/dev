# deep-foundation

[![Gitpod](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deep-foundation/dev)

## gitpod usage

Everything starts automatically. Just watch the terminal.

When all tasks are done, you can open - http://localhost:3007/ **(ctrl/cmd + click by link)**


## local usage

- make sure to use `node v14.15.0` (we recommend to use nvm)
- install docker and docker-compose
- `git clone https://github.com/deep-foundation/dev.git; npm ci; npm run packages; npm run local;`

## manual terminal methods

### gitpod

- `npm ci; npm run git-shh-to-https; npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm ci; npm run git-shh-to-https; npm run gitpod` in gitpod to complete a start up
- `npm run rm-migrates` to delete all .migrate artifacts of npm migrate package
- `npm ci && npm run clear` stop and clear all dockers composes/containers/volumes
- `npm run materialized-path` after `gitpod` script, run mp tests

### local

- `npm ci && npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm run local` to complete a local start up
- `npm run rm-migrates` to delete all .migrate artifacts of npm migrate package
- `npm run clear` stop and clear all dockers composes/containers/volumes
- `npm run materialized-path` after `gitpod` script, run mp tests

## unsafe gulp methods 

- **attention! before work checkout to branch from detached commits in each needed submodule**
- `npm run gulp -- packages:get` clone and install all packages **starts automatically in workspace**
- `(cd packages/hasura && npm run docker-local)` start docker postgres and hasura locally **starts automatically in workspace**
- `npm run gulp -- packages:set` fast git add git commit and git push deepcase repo
- `npm run gulp -- package:insert --url HTTPGITURL --name NAMEINPACKAGESDIRECTORY` insert submodule
- `npm run gulp -- package:delete --name NAMEINPACKAGESDIRECTORY` delete submodule
- `npm run gulp -- assets:update` copy all assets from ./assets in to each package
- `npm run gulp -- packages:sync` sync all dependenced packages in workspace
