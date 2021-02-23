
import url from 'url';
import del from 'del';
import fs from 'fs';
import concurrently from 'concurrently';
import minimist from 'minimist';
import * as gulp from 'gulp';
import Git from 'simple-git/promise';

const git = Git();
const argv = require('minimist')(process.argv.slice(2));

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
  await git.submoduleUpdate();
  const packages = fs.readdirSync(`${__dirname}/packages`);
  for (let p in packages) {
    const pckg = packages[p];
    await concurrently([`(cd ${__dirname}/packages/${pckg} && npm i)`]);
  }
});

gulp.task('packages:set', async () => {
  await git.add('*');
  await git.commit('packages:set');
  await git.push();
});

gulp.task('packages:links', async () => {
  const packages = fs.readdirSync(`${__dirname}/packages`);
  const npmPackages = {};
  for (let p in packages) {
    try {
      const pa = packages[p];
      const pckg = require(`./packages/${pa}/package.json`);
      if (pckg?.scripts?.['package:build']) {
        npmPackages[pckg.name] = pa;
        await concurrently([`(cd ${__dirname}/packages/${pa} && npm run package:build)`]);
      }
    } catch (error) {}
  }
  for (let p in packages) {
    try {
      const pa = packages[p];
      const pckg = require(`./packages/${pa}/package.json`);
      const deps = [...Object.keys(pckg.dependencies), ...Object.keys(pckg.devDependencies)];
      const needed = deps.filter(d => npmPackages[d]);
      if (needed.length) {
        for (let n in needed) {
          await concurrently([`(rm -rf ${__dirname}/packages/${pa}/node_modules/${needed[n]} && mkdir -p ${__dirname}/packages/${pa}/node_modules/${needed[n]} && rsync -av --progress ${__dirname}/packages/${npmPackages[needed[n]]}/ ${__dirname}/packages/${pa}/node_modules/${needed[n]} --exclude node_modules --exclude *.ts --exclude *.tsx)`]);
        }
      }
    } catch (error) {}
  }
  for (let p in packages) {
    try {
      const pa = packages[p];
      const pckg = require(`./packages/${pa}/package.json`);
      if (pckg?.scripts?.['package:unbuild']) {
        await concurrently([`(cd ${__dirname}/packages/${pa} && npm run package:unbuild)`]);
      }
    } catch (error) {}
  }
});
