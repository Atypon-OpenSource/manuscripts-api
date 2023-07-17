#!/usr/bin/env bash

set -e # exit if any step fails

# copy CSL styles
mkdir -p dist/config/csl/styles
find config/csl/styles -name '*.csl' -exec cp "{}" dist/config/csl/styles/ \;
# TODO: rewrite dependent styles?

# copy CSL locales
node config/scripts/build-locales-json.js
find config/csl/locales -maxdepth 1 -name '*.xml' -exec cp "{}" dist/config/csl/locales/ \;

# build CSL styles files
node config/scripts/build-styles.js

# copy shared data
mkdir -p dist/config/shared
find config/shared -maxdepth 1 -name '*.json' -exec cp "{}" dist/config/shared/ \;

# extract shared data from databases
node config/scripts/extract-databases.js

# verify extracted data
node config/scripts/verify-bundles.js
node config/scripts/verify-templates.js

