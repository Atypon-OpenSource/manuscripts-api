#!/bin/bash
set -e
env $(cat $1 | xargs) npx gulp -f docker/utils/Gulpfile.js
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up --build --force-recreate --no-start
