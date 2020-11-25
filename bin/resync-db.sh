#!/bin/bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# This 2 lines are needed for testing locally
#ROOT_PATH="$( dirname $DIR )"
#eval $(grep -v -e '^#' $ROOT_PATH/.env | xargs -I {} echo export \'{}\')
$DIR/resync-db.js --bringOnlineOnly=0 --dbURI=$APP_DB_URI --cbUser=$APP_COUCHBASE_ADMIN_USER --cbPass=$APP_COUCHBASE_ADMIN_PASS --sgHostname=$APP_GATEWAY_HOSTNAME --sgPort=$APP_GATEWAY_ADMIN_PORT --stateBucket=$APP_STATE_BUCKET --dataBucket=$APP_DATA_BUCKET --derivedBucket=$APP_DERIVED_DATA_BUCKET
