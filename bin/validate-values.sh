#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

./bin/validate-values.js \
  ${DIR}/../docker/values.yml \
  ${DIR}/../helm_repo/manuscripts-api/values.yaml \
  ${DIR}/../helm_repo/manuscripts-api/charts/**/values.yaml