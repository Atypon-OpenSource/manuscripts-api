#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

# no need to wait for cb/sg if we're just running unit tests.
if [[ $@ =~ .*test:unit$ ]]
then
  exec "$@"
fi

echo "Waiting for couchbase at ${APP_COUCHBASE_HOSTNAME}:8091..."

attempts=0

# We don't even know if CB is up at this point
while ! timeout 1 bash -c "echo > /dev/tcp/$APP_COUCHBASE_HOSTNAME/8091" 2>/dev/null
do
  attempts=$((attempts + 1))
  if [ $attempts -eq 128 ]
  then
    echo "Failed to connect to Couchbase Server within timeout."
    exit 1
  fi
  sleep 1
done

echo "Couchbase visible. Waiting for buckets…"

buckets=\
($APP_DATA_BUCKET \
$APP_USER_BUCKET \
$APP_STATE_BUCKET \
$APP_DERIVED_DATA_BUCKET \
$APP_DISCUSSIONS_BUCKET)

for bucket in "${buckets[@]}"; do
  bucket_attempts=0
  # This will try and get bucket info (created in the penultimate step of cb
  # entry_point script). It also uses the RBAC user created in the final step.
  until $(curl -o /dev/null -s --head --fail \
    "http://$APP_COUCHBASE_HOSTNAME:8091/pools/default/buckets/${bucket}" \
    -u "${bucket}:${APP_COUCHBASE_RBAC_PASSWORD}")
  do
    bucket_attempts=$((bucket_attempts + 1))
    if [ $bucket_attempts -eq 512 ]
    then
      echo "Bucket '${bucket}' did not appear within timeout"
      exit 1
    fi
    sleep 1
  done
done

echo "Buckets found."

if [ "$WAIT_FOR_SYNC_GATEWAY" = "true" ]; then
  echo "Waiting for Sync Gateway at http://$APP_GATEWAY_HOSTNAME:4985 to become reachable…"

  sg_attempts=0

  until $(curl -o /dev/null -s --head --fail "http://$APP_GATEWAY_HOSTNAME:4985/")
  do
    sg_attempts=$((sg_attempts + 1))
    if [ $sg_attempts -eq 512 ]
    then
      echo "Sync Gateway admin endpoint did not appear within timeout"
      exit 1
    fi
    sleep 1
  done
  echo "Sync Gateway ready. Now just waiting for a moment still…"
fi

echo "Waiting for N1QL services…"


for bucket in "${buckets[@]}"; do
  echo "Waiting for N1QL service for the \"${bucket}\" bucket"
  ${DIR}/wait_for_n1ql_service.js ${bucket}
done

echo "Executing command..."

# The exec() family of functions replaces the current process image with a new process image.
# Imagine fork without the forking
exec "$@"
