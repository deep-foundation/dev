
import url from 'url';
import util from 'gulp-util';
import * as gulp from 'gulp';
import Git from 'simple-git/promise';
const git = Git();

gulp.task('assets:update', () => (
  gulp.src('assets/*', { base: 'assets' }).pipe(gulp.dest('./applications/'))
));

gulp.task('package:add', async () => {
  await git.submoduleAdd(util.env.url, `packages/${util.env.name}`);
});
