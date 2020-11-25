#!/bin/bash
set -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

APP_COUCHBASE_HOSTNAME=$(cat .env | grep APP_COUCHBASE_HOSTNAME= | cut -f 2 -d'=')
APP_GATEWAY_HOSTNAME=$(cat .env | grep APP_GATEWAY_HOSTNAME= | cut -f 2 -d'=')

env $(cat .env | sed 's/NODE_ENV=development/NODE_ENV=test/' | sed 's/NODE_ENV=production/NODE_ENV=test/' | xargs) npx gulp -f docker/utils/Gulpfile.js

docker-compose -f docker/docker-compose.yml down -v

echo "Starting up ${APP_COUCHBASE_HOSTNAME} and ${APP_GATEWAY_HOSTNAME}…"
docker-compose -f docker/docker-compose.yml up --build ${APP_GATEWAY_HOSTNAME}
