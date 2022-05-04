#!/bin/bash

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
  
  token=$(curl -o response.txt 'http://localhost:3000/api/v1/auth/login' \
    --silent \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'manuscripts-app-id: io.manuscripts' \
    -H 'manuscripts-app-secret: Valid secret' \
    --data-binary "{\"email\":\"$email\",\"password\":\"123123123\",\"deviceId\":\"deviceId1\"}" && \
    cat response.txt | grep -o '"token": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"') && rm response.txt

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/MPProject:$user" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \

  curl 'http://localhost:3000/api/v1/project/create' \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data-binary "{\"_id\":\"MPProject:$user\"}" && \
  echo -e "Project\"MPProject:$user\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/jats-sample.zip"
  file_path="$parent_path/$zip_path"

  curl "http://localhost:3000/api/v1/project/MPProject:$user" \
  --fail \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  -F "file=@$file_path" 

  echo -e "Project\"MPProject:$user\" seeded with a manuscript\n"

done
