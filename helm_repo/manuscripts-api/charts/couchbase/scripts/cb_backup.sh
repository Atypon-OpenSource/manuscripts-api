#!/bin/bash

# Take a backup
# Compact the backup (make slim)
# If we have more than 7 backups, merge the older ones

cbbackupmgr backup --archive /backups/cb --repo couchbase --cluster couchbase://${APP_COUCHBASE_HOSTNAME}:8091 --username ${APP_COUCHBASE_ADMIN_USER} --password ${APP_COUCHBASE_ADMIN_PASS} --no-progress-bar && \
cbbackupmgr compact -a /backups/cb/ -r couchbase --backup latest && \
NO_OF_BACKUPS=$(ls -d /backups/cb/couchbase/*/ | wc -l) && \
if [ "$NO_OF_BACKUPS" -gt "8" ] ; then
  let BACKUPS_TO_MERGE=${NO_OF_BACKUPS}-7 && \
  cbbackupmgr merge --archive /backups/cb --repo couchbase --start oldest --end $BACKUPS_TO_MERGE
fi
