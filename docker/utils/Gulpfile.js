const gulp = require('gulp');
const ejs = require('gulp-ejs');
const process = require('process');
const assert = require('assert');
const fs = require('fs');

const child_process = require('child_process');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const get_version_path = __dirname + '/../../bin/get-version.sh';

const revision = fs.existsSync(get_version_path)
  ? require('child_process').execSync(get_version_path).toString().trim()
  : "unknown-version";

const config = {}
Object.keys(process.env).filter(k => k.match(/^APP_/) || k.match(/^NODE_ENV$/))
                        .forEach(k => config[k.toLowerCase()] = process.env[k])

config.app_test_action = config.app_test_action || 'test'

if (!config.app_initialize) {
  config.app_initialize = '0';
}

if (!config.app_run_after_initialize) {
  config.app_run_after_initialize = '0';
}

if (!config.app_version) {
    config.app_version = revision
}

if (!config.app_gateway_log_level) {
  config.app_gateway_log_level = 
    process.env.NODE_ENV === 'production' 
    ? '["HTTP"]'
    : '["HTTP", "CRUD", "Sync", "Access", "Attach", "Bucket"]'
}

gulp.task('validate-env', (done) => {
  for (const [key, value] of Object.entries(config)) {
    assert(value, `Missing ${key.toUpperCase()}`);
  }
  done();
});

gulp.task('compile-docker-compose-yml', () => {
  return gulp.src('./templates/docker-compose.yml.ejs')
    .pipe(ejs(config, {}, { ext: '' }))
    .pipe(gulp.dest('../'));
});

gulp.task(
  'default',
  gulp.series(
    'validate-env',
    'compile-docker-compose-yml'
  )
);

gulp.task(
  'dev',
  gulp.series(
    'validate-env',
    'compile-docker-compose-yml'
  )
);
