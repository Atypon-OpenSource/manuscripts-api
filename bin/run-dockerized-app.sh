#!/bin/bash
set -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

env $(cat .env | xargs) npx gulp dev -f docker/utils/Gulpfile.js

if [[ $# -eq 1 ]] && [[ $1 == 'reset' ]]; then
  docker-compose -f docker/docker-compose.yml down -v
fi

docker-compose -f docker/docker-compose.yml up --build
