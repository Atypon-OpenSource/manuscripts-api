#!/bin/bash

users=(bob)

emails=("${users[@]/%/@example.com}")

# create two users
for i in "${!users[@]}"
do
  user="${users[$i]}"
  email="${emails[$i]}"

  manuscript="8b3240f3-9a3a-4d18-afc9-44897609c789"
  project="76230444-c53c-421b-b0d4-f8df9bde1fbe"

  token=$(curl -o response.txt 'http://localhost:3000/api/v1/auth/login' \
    --silent \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'manuscripts-app-id: io.manuscripts' \
    -H 'manuscripts-app-secret: Valid secret' \
    --data-binary "{\"email\":\"$email\",\"password\":\"123123123\",\"deviceId\":\"deviceId1\"}" && \
    cat response.txt | grep -o '"token": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"') && rm response.txt

  echo -e "Token \"$token\" created\n"

  curl 'http://localhost:3000/api/v1/container/project/create' \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data-binary "{\"_id\":\"MPProject:$project\"}" && \
  echo -e "\"MPProject:$project\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:$project/manuscripts/MPManuscript:$manuscript" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:$manuscript\" created\n"

  parent_path=$(pwd)
  user_specific_file_path="bin/stack-error.json"
  file_path="$parent_path/$zip_path"

  echo $user_specific_file_path

  curl "http://localhost:3000/api/v1/project/MPProject:$project/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$user_specific_file_path" \

  rm $user_specific_file_path

  echo -e "Project\"MPProject:$project\" seeded with a manuscript\n"

done
