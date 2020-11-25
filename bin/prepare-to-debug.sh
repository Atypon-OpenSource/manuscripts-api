#!/bin/bash
set -e

# copy .env.example to .env if .env does not exist
. "${BASH_SOURCE%/*}/cp-env.sh"

cat .env \
| sed 's|APP_COUCHBASE_HOSTNAME=couchbase|APP_COUCHBASE_HOSTNAME=localhost|' \
| sed 's|couchbase://couchbase/|couchbase://localhost/|' \
| sed 's|APP_GATEWAY_HOSTNAME=sync_gateway|APP_GATEWAY_HOSTNAME=localhost|' > .env.example.debug
npm run build
