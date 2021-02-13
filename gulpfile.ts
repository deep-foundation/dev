
import url from 'url';
import del from 'del';
import util from 'gulp-util';
import * as gulp from 'gulp';
import Git from 'simple-git/promise';
const git = Git();

gulp.task('assets:update', () => (
  gulp.src('assets/*', { base: 'assets' }).pipe(gulp.dest('./applications/'))
));

gulp.task('package:insert', async () => {
  await git.submoduleAdd(util.env.url, `packages/${util.env.name}`);
});

gulp.task('package:delete', async () => {
  await del([`packages/${util.env.name}`, `.git/modules/packages/${util.env.name}`]);
  await git.rm(`packages/${util.env.name}`);
});
