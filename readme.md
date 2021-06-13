# deepcase

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deepcase/deepcase)

## safe methods

```sh
# just run in gitppod
npm run git-shh-to-https && npm ci && npm run packages && npm run gitpod
# or locally
npm ci && npm run packages && npm run local
```

- `npm run packages` before all
- `npm run gitpod` in gitpod for fully start
- `npm run local` for locally fully start
- `npm run rm-migrates` for delete all artifacts .migrate of npm migrate package

## unsafe gulp methods 

- **attention! before work checkout to branch from detached commits in each needed submodule**
- `npm run gulp -- packages:get` clone and install all packages **starts automatically in workspace**
- `(cd packages/hasura && npm run docker-local)` start docker postgres and hasura locally **starts automatically in workspace**
- `npm run gulp -- packages:set` fast git add git commit and git push deepcase repo
- `npm run gulp -- package:insert --url HTTPGITURL --name NAMEINPACKAGESDIRECTORY` insert submodule
- `npm run gulp -- package:delete --name NAMEINPACKAGESDIRECTORY` delete submodule
- `npm run gulp -- assets:update` copy all assets from ./assets in to each package
- `npm run gulp -- packages:sync` sync all dependenced packages in workspace
