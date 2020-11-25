#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_VERSIONED_TAG="registry.gitlab.com/mpapp-private/manuscripts-api/app:$($DIR/../bin/get-version.sh)"

echo "Committing, tagging, pushing tagging app…"
cd $DIR/..
docker build -t app -f ./docker/app/Dockerfile .
docker tag app registry.gitlab.com/mpapp-private/manuscripts-api/app
docker tag app $API_VERSIONED_TAG
docker push registry.gitlab.com/mpapp-private/manuscripts-api/app
