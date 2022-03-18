#!/bin/bash
set  -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

env $(cat .env | sed 's/NODE_ENV=development/NODE_ENV=test/' | sed 's/NODE_ENV=production/NODE_ENV=test/' | xargs) APP_PRESSROOM_BASE_URL=https://pressroom-js-dev.manuscripts.io APP_PRESSROOM_APIKEY=cndbvbvjosp0viowj  npx gulp -f docker/utils/Gulpfile.js
docker-compose -f docker/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml up --build -d postgres
APP_DATABASE_URL=postgresql://postgres:admin@localhost:5432/test?schema=public npm run migrate-prisma
docker-compose -f docker/docker-compose.yml up --build --abort-on-container-exit test_runner
