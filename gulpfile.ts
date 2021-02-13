
import url from 'url';
import del from 'del';
import fs from 'fs';
import concurrently from 'concurrently';
import minimist from 'minimist';
import * as gulp from 'gulp';
import Git from 'simple-git/promise';

const git = Git();
const argv = require('minimist')(process.argv.slice(2));

gulp.task('assets:update', () => (
  gulp.src('assets/*', { base: 'assets' }).pipe(gulp.dest('./applications/'))
));

gulp.task('package:insert', async () => {
  await git.submoduleAdd(argv.url, `packages/${argv.name}`);
});

gulp.task('package:delete', async () => {
  await del([`packages/${argv.name}`, `.git/modules/packages/${argv.name}`]);
  await git.rm(`packages/${argv.name}`);
});

gulp.task('packages:update', async () => {
  await git.submoduleUpdate();
  const packages = fs.readdirSync(`${__dirname}/packages`);
  for (let p in packages) {
    const pckg = packages[p];
    await concurrently([`(cd ${__dirname}/packages/${pckg} && npm i)`]);
  }
});
