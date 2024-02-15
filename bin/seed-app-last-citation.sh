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

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:e57cd534-1df1-4076-ad90-abcec74bb702" \
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
  --data-binary "{\"_id\":\"MPProject:e57cd534-1df1-4076-ad90-abcec74bb702\"}" && \
  echo -e "\"MPProject:e57cd534-1df1-4076-ad90-abcec74bb702\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:e57cd534-1df1-4076-ad90-abcec74bb702/manuscripts/MPManuscript:8FE22434-09F7-4F71-A326-A53C80E1FD45" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:8FE22434-09F7-4F71-A326-A53C80E1FD45\" created\n"

  parent_path=$(pwd)
  user_specific_file_path="$parent_path/test/data/fixtures/sample/last-citation.manuscript-json"

  echo $user_specific_file_path

  # cp $file_path $user_specific_file_path
  # if [ "$(uname)" == "Darwin" ]; then
  #     sed -i '' "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:e57cd534-1df1-4076-ad90-abcec74bb702/g" $user_specific_file_path
  #     sed -i '' "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript::basic-man/g" $user_specific_file_path
  # elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  #     sed -i "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:e57cd534-1df1-4076-ad90-abcec74bb702/g" $user_specific_file_path
  #     sed -i "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript::basic-man/g" $user_specific_file_path
  # fi

  curl "http://localhost:3000/api/v1/project/MPProject:e57cd534-1df1-4076-ad90-abcec74bb702/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$user_specific_file_path" \

 # rm $user_specific_file_path

  echo -e "Project\"MPProject:e57cd534-1df1-4076-ad90-abcec74bb702\" seeded with a manuscript\n"
