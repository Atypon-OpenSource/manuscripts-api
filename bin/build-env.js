#!/usr/bin/env node
const fs = require('fs');

const example_dict = {};
const example_path = process.argv[2];
const example_keypairs = fs.readFileSync(example_path, 'utf8')
  .split('\n')
  .filter(x => x.length > 0)
  .map(function (x) {
    const key = x.substring(0, x.indexOf('='))
    const val = x.substring(x.indexOf('=') + 1)
    return [key, val]
  });
example_keypairs.forEach(x => example_dict[x[0]] = x[1]);

const wanted_keys_predicate = x => x.startsWith('APP_');
const provided_keys = Object.keys(process.env).filter(wanted_keys_predicate);

const actual_app_env = {};
provided_keys
  .filter(wanted_keys_predicate)
  .forEach(x => actual_app_env[x] = process.env[x]);

Object.keys(example_dict).forEach(x => {
  if (!actual_app_env[x]) {
    actual_app_env[x] = example_dict[x];
  }
});

process.stdout.write(Object.keys(actual_app_env).map(x => `${x}=${actual_app_env[x]}`).join('\n'));
