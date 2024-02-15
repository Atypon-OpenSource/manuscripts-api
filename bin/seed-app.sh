#!/bin/bash

users=(alice bob2)

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

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:$user" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \

  curl 'http://localhost:3000/api/v1/container/project/create' \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data-binary "{\"_id\":\"MPProject:$user\"}" && \
  echo -e "\"MPProject:$user\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:$user/manuscripts/MPManuscript:$user" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:$user\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/sample/seed.manuscript-json"
  user_specific_zip_path="test/data/fixtures/sample/$user.manuscript-json"
  file_path="$parent_path/$zip_path"
  user_specific_file_path="$parent_path/$user_specific_zip_path"

  echo $user_specific_file_path

  cp $file_path $user_specific_file_path
  if [ "$(uname)" == "Darwin" ]; then
      sed -i '' "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:$user/g" $user_specific_file_path
      sed -i '' "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:$user/g" $user_specific_file_path
  elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
      sed -i "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:$user/g" $user_specific_file_path
      sed -i "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:$user/g" $user_specific_file_path
  fi

  curl "http://localhost:3000/api/v1/project/MPProject:$user/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$user_specific_file_path" \

  rm $user_specific_file_path

  echo -e "Project\"MPProject:$user\" seeded with a manuscript\n"

done