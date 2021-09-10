# deepcase

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deepcase/deepcase)

## gitpod usage

Everything starts automatically. Just watch the terminal.

When all tasks are done, you can open - http://localhost:3007/ **(ctrl/cmd + click by link)**

## manual terminal methods

### gitpod

- `npm ci; npm run git-shh-to-https; npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm ci; npm run git-shh-to-https; npm run gitpod` in gitpod for fully start
- `npm run rm-migrates` for delete all artifacts .migrate of npm migrate package
- `npm ci && npm run clear` stop and clear all dockers composes/containers/volumes
- `npm run materialized-path` after `gitpod` script, run mp tests

### local

- `npm ci && npm run packages` before all, only ONCE PER GITPOD CONTAINER!
- `npm run local` for locally fully start- uses: stefanzweifel/git-auto-commit-action@v4
- `npm run rm-migrates` for delete all artifacts .migrate of npm migrate package
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
