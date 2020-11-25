#!/bin/bash

set -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

export NODE_ENV=production
env $(cat .env | xargs) npx gulp -f docker/utils/Gulpfile.js
