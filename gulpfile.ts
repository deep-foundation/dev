
import url from 'url';
import del from 'del';
import fs from 'fs';
import concurrently from 'concurrently';
import minimist from 'minimist';
import * as gulp from 'gulp';
import Git from 'simple-git/promise';
import { HasuraApi } from '@deep-foundation/hasura/api';

process.setMaxListeners(0);

const git = Git();
const argv = require('minimist')(process.argv.slice(2));
const delimetr = process.platform === 'win32' ? '\\' : '/';

const api = new HasuraApi({
  path: process.env.REATTACH_HASURA_PATH,
  ssl: !!+(process.env.REATTACH_HASURA_SSL || 0),
  secret: process.env.REATTACH_HASURA_SECRET,
});

gulp.task('gitpod:hasura:reattach', async () => {
  console.log(process.env.REATTACH_DEEPLINKS_PATH);
  const u = new url.URL(`https://${process.env.REATTACH_DEEPLINKS_PATH}`);
  const convert = (a) => {
    console.log('a', a)
    const au = new url.URL(a);
    return `${u.origin}/${au.pathname}`;
  };
  const { data } = await api.query({
    type: "export_metadata",
    version: 1,
    args: {}
  });
  await api.query({
    "type": "drop_inconsistent_metadata",
    "args": {}
  });
  console.log('remote_schemas', data.remote_schemas);
  for (let p in data.remote_schemas) {
    const i = data.remote_schemas[p];
    console.log('remote_schema ', i);
    await api.query({
      type: "add_remote_schema",
      args: {
        ...i,
        name: i.name,
        definition: {
          url: convert(i.definition.url),
          ...i.definition,
        },
      }
    });
  }
  console.log('actions', data.actions);
  for (let p in data.actions) {
    const i = data.actions[p];
    await api.query({
      type: "create_action",
      args: {
        ...i,
        name: i.name,
        definition: {
          url: convert(i.definition.handler),
          ...i.definition,
        },
      }
    });
  }
  console.log('custom_types', data.custom_types);
  console.log('cron_triggers', data.cron_triggers);
  for (let p in data.cron_triggers) {
    const i = data.cron_triggers[p];
    await api.query({
      type: "delete_cron_trigger",
      args: {
        name: i.name,
      }
    });
    await api.query({
      type: "create_cron_trigger",
      args: {
        ...i,
        name: i.name,
        webhook: convert(i.webhook),
      }
    });
  }
  await api.query({
    type: "reload_metadata",
    args: {
      reload_remote_schemas: true,
      reload_sources: false,
      recreate_event_triggers: true
    }
  });
});

gulp.task('assets:update', () => {
  const packages = fs.readdirSync(`${__dirname}/packages`);
  let g = gulp.src('assets/*', { base: 'assets' }).pipe(gulp.dest(`./`));
  for (let p in packages) {
    const pckg = packages[p];
    g = g.pipe(gulp.dest(`./packages/${pckg}/`));
  }
  return g;
});

gulp.task('package:insert', async () => {
  await git.submoduleAdd(argv.url, `packages/${argv.name}`);
});

gulp.task('package:delete', async () => {
  await del([`packages/${argv.name}`, `.git/modules/packages/${argv.name}`]);
  await git.rm(`packages/${argv.name}`);
});

gulp.task('packages:get', async () => {
  await git.submoduleInit();
  await git.submoduleUpdate();
  await gitBranches();
});

gulp.task('packages:ci', async () => {
  const modules = getModules();
  const parts = [];
  
  const packages = Object.keys(modules);
  for (let i = 0; i < packages.length; i++) {
    const currentPackage = process.platform === 'win32' ? packages[i].replace('/', '\\') : packages[i];
    if (
      !currentPackage.includes('deeplinks') &&
      !currentPackage.includes('deepcase') &&
      !currentPackage.includes('python-docker-isolation-provider') &&
      !currentPackage.includes('workflows')
    ) {
      parts.push(`echo "${currentPackage} npm ci" && cd ${__dirname}${delimetr}${currentPackage} && npm ci`);
    }
  }
  const command = parts.join(` && cd ..${delimetr}.. && `);
  console.log('command', command);
  await concurrently([command]);
});

const getModules = () => {
  const gitmodules = fs.readFileSync(`${__dirname}/.gitmodules`, { encoding: 'utf8' });
  const regex = /\[submodule ?"(?<submodule_name>.+?)"]\s+path ?= ?(?<path>.+?)\s+url ?= ?(?<url>.+?)\s/gm;
  const modules = {};

  let submodule;

  while ((submodule = regex.exec(gitmodules)) !== null) {
    const {submodule_name, path, url} = submodule.groups
    modules[submodule_name] = {
      path,
      url,
    }
  }
  
  return modules;
}

const gitBranches = async () => {
  const modules = getModules();
  const commands = [];

  const packages = Object.keys(modules);
  for (let i = 0; i < packages.length; i++) {
    const currentPackage = process.platform === 'win32' ? packages[i].replace('/', '\\') : packages[i];
    const part = `cd ${__dirname}${delimetr}${currentPackage} && ../../checkout-on-same-commit.sh ${modules?.[currentPackage]?.branch || 'main'}`;
    commands.push(part);
  }
  await concurrently(commands);
};

gulp.task('packages:branches', gitBranches);

gulp.task('packages:set', async () => {
  await git.add('*');
  await git.commit('packages:set');
  await git.push();
});

gulp.task('packages:sync', async () => {
  const packages = fs.readdirSync(`${__dirname}/packages`);
  const npmPackages = {};
  console.log('find buildable packages');
  for (let p in packages) {
    const pa = packages[p];
    try {
      console.log(pa);
      const pckg = require(`./packages/${pa}/package.json`);
      console.log(pa, 'loaded as', pckg.name);
      npmPackages[pckg.name] = { pckgname: pckg.name, dirname: pa, depended: [], builded: false, pckg };
    } catch (error) {
      console.log(pa, 'error');
    }
  }
  console.log('make depended tree');
  for (let p in packages) {
    try {
      const pa = packages[p];
      const pckg = require(`./packages/${pa}/package.json`);
      const depended = [...Object.keys({ ...pckg?.dependencies, ...pckg?.devDependencies, ...pckg?.peerDependencies })];
      const needed = depended.filter(d => pckg.name != d && !!npmPackages[d]);
      if (needed.length) {
        for (let n in needed) {
          console.log(needed[n], pckg.name);
          npmPackages[needed[n]].depended.push(pckg.name);
        }
      }
    } catch (error) {
      // console.error(error);
    }
  }
  console.log('build and sync to all depended');
  let parentPkgName;
  const _npmPackages = Object.keys(npmPackages);
  while ((parentPkgName = _npmPackages.find(n1 => {
    return !npmPackages[n1].builded && !_npmPackages.find(n2 => !!~npmPackages[n2].depended.indexOf(n1))
  }), !!parentPkgName)) {
    const parentPkg = npmPackages[parentPkgName];
    parentPkg.builded = true;
    console.log('build', parentPkgName);
    try {
      if (parentPkg.pckg?.scripts?.['package:build']) {
        await concurrently([`(cd ${__dirname}/packages/${parentPkg.dirname} && npm run package:build)`]);
      }
    } catch (error) {
      console.error(error);
    }
    for (let c in parentPkg.depended) {
      console.log('sync', parentPkgName, 'to', parentPkg.depended[c]);
      try {
        console.log(`(rm -rf ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} && mkdir -p ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} && rsync -av --progress ${__dirname}/packages/${parentPkg.dirname}/ ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} --exclude node_modules --exclude *.ts --exclude *.tsx --include *.d.ts)`);
        await concurrently([`(rm -rf ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} && mkdir -p ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} && rsync -av --progress ${__dirname}/packages/${parentPkg.dirname}/ ${__dirname}/packages/${npmPackages[parentPkg.depended[c]].dirname}/node_modules/${parentPkg.pckgname} --exclude node_modules --exclude *.ts --exclude *.tsx --include *.d.ts)`]);
      } catch (error) {
        console.error(error);
        console.log({ npmPackages, parentPkg, c });
      }
    }
    parentPkg.depended = [];
  }
  console.log('unbuild all');
  for (let p in packages) {
    try {
      const pa = packages[p];
      const pckg = require(`./packages/${pa}/package.json`);
      console.log('unbuild', pckg.name);
      if (pckg?.scripts?.['package:unbuild']) {
        await concurrently([`(cd ${__dirname}/packages/${pa} && npm run package:unbuild)`]);
      }
    } catch (error) {}
  }
});
