#!/bin/bash
set -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

env $(cat .env | sed 's/NODE_ENV=development/NODE_ENV=test/' | sed 's/NODE_ENV=production/NODE_ENV=test/' | xargs) npx gulp -f docker/utils/Gulpfile.js

docker-compose -f docker/docker-compose.yml down -v

echo "Starting up Postgres"
docker-compose -f docker/docker-compose.yml up --build --abort-on-container-exit postgres
