#!/bin/bash
set -e

if [ "$APP_INITIALIZE" = "1" ]; then
  echo 2
  sleep 3
  npm run migrate-prisma
  INITIALIZE_DATABASE=true npm run run
else
  echo 3
  sleep 3
  npm run migrate-prisma
  INITIALIZE_DATABASE=false npm run run
fi
