#!/bin/bash
set -e

npm run build

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

MODIFIED_ENV=$(cat .env \
| sed 's|APP_COUCHBASE_HOSTNAME=couchbase|APP_COUCHBASE_HOSTNAME=localhost|' \
| sed 's|couchbase://couchbase/|couchbase://localhost/|' \
| sed 's|APP_GATEWAY_HOSTNAME=sync_gateway|APP_GATEWAY_HOSTNAME=localhost|' \
| sed 's/NODE_ENV=test/NODE_ENV=development/' \
| sed 's/NODE_ENV=production/NODE_ENV=development/')

# run the app enough to initialize database state + quit.
env $(echo $MODIFIED_ENV) INITIALIZE_DATABASE=true npm run run

# actually run the app.
env $(echo $MODIFIED_ENV) npm run run
