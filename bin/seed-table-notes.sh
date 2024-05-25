#!/bin/bash

users=(alice bob2)

emails=("${users[@]/%/@example.com}")

# create two users
  token=$(curl -o response.txt 'http://localhost:3000/api/v1/auth/login' \
    --silent \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'manuscripts-app-id: io.manuscripts' \
    -H 'manuscripts-app-secret: Valid secret' \
    --data-binary "{\"email\":\"bob2@example.com\",\"password\":\"123123123\",\"deviceId\":\"deviceId1\"}" && \
    cat response.txt | grep -o '"token": *"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"') && rm response.txt

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:256b226a-739c-492c-ac97-8d5416125c62" \
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
  --data-binary "{\"_id\":\"MPProject:256b226a-739c-492c-ac97-8d5416125c62\"}" && \
  echo -e "\"MPProject:256b226a-739c-492c-ac97-8d5416125c62\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:256b226a-739c-492c-ac97-8d5416125c62/manuscripts/MPManuscript:E2428A08-56AD-4A40-8CE6-4034D1340486" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:E2428A08-56AD-4A40-8CE6-4034D1340486\" created\n"

  parent_path=$(pwd)
  user_specific_file_path="$parent_path/test/data/fixtures/sample/athena-table-notes.manuscript-json"

  echo $user_specific_file_path

  # cp $file_path $user_specific_file_path
  # if [ "$(uname)" == "Darwin" ]; then
  #     sed -i '' "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:256b226a-739c-492c-ac97-8d5416125c62/g" $user_specific_file_path
  #     sed -i '' "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:E2428A08-56AD-4A40-8CE6-4034D1340486/g" $user_specific_file_path
  # elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  #     sed -i "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:256b226a-739c-492c-ac97-8d5416125c62/g" $user_specific_file_path
  #     sed -i "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:E2428A08-56AD-4A40-8CE6-4034D1340486/g" $user_specific_file_path
  # fi

  curl "http://localhost:3000/api/v1/project/MPProject:256b226a-739c-492c-ac97-8d5416125c62/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$user_specific_file_path" \

 # rm $user_specific_file_path

  echo -e "Project\"MPProject:256b226a-739c-492c-ac97-8d5416125c62\" seeded with a manuscript\n"
