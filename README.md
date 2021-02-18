# deepcase

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/deepcase/deepcase)

- **attemption! before work checkout to branch from detached commits in each needed submodule**
- `npx gulp packages:get` clone and install all packages **starts automatically in workspace**
- `(cd packages/hasura && npm run docker-local)` start docker postgres and hasura locally **starts automatically in workspace**
- `npm gulp packages:set` fast git add git commit and git push deepcase repo
- `npm gulp package:insert --url HTTPGITURL --name NAMEINPACKAGESDIRECTORY` insert submodule
- `npm gulp package:delete --name NAMEINPACKAGESDIRECTORY` delete submodule
- `npm gulp assets:update` copy all assets from ./assets in to each package
