#!/bin/bash

# initialize
. "${BASH_SOURCE%/*}/run-local-app-init.sh"

echo -e "\n"

users=(alice bob)

emails=("${users[@]/%/@example.com}")

# create two users
for i in "${!users[@]}"
do
  user="${users[$i]}"
  email="${emails[$i]}"
  curl 'http://localhost:3000/api/v1/registration/signup' \
    --fail \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    --data-binary "{\"email\":\"$email\",\"password\":\"123123123\",\"name\":\"$user\"}" && \
    echo -e "User \"$email\" created\n"
done
