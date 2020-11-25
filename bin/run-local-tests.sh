#!/bin/bash
set  -e

npm run build

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

#MODIFIED_ENV=$(cat .env \
#| sed 's|APP_COUCHBASE_HOSTNAME=couchbase|APP_COUCHBASE_HOSTNAME=localhost|' \
#| sed 's|couchbase://couchbase/|couchbase://localhost/|' \
#| sed 's|APP_GATEWAY_HOSTNAME=sync_gateway|APP_GATEWAY_HOSTNAME=localhost|' \
#| sed 's/NODE_ENV=development/NODE_ENV=test/' \
#| sed 's/NODE_ENV=production/NODE_ENV=test/')

# echo  $MODIFIED_ENV > .env
env $(cat .env | sed 's/NODE_ENV=development/NODE_ENV=test/' | sed 's/NODE_ENV=production/NODE_ENV=test/' | xargs) npm run test
