#!/bin/bash
set -e
if [ "$APP_INITIALIZE" = "1" ] && [ "$APP_RUN_AFTER_INITIALIZE" = "1" ]; then
  WAIT_FOR_SYNC_GATEWAY=true INITIALIZE_DATABASE=true /opt/wait_for_couchbase.sh npm run run
  npm run run
elif [ "$APP_INITIALIZE" = "1" ]; then
  WAIT_FOR_SYNC_GATEWAY=true INITIALIZE_DATABASE=true /opt/wait_for_couchbase.sh npm run run
else
  WAIT_FOR_SYNC_GATEWAY=true /opt/wait_for_couchbase.sh npm run run
fi
