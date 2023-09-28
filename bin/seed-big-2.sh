#!/bin/bash

users=(bob2)

emails=("${users[@]/%/@example.com}")

# create two users
  user="bob2"
  email="bob@example.com"
  token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiZThlMzZkMzJlNjUwZDdkM2QyNTA1NmFlMmE4NGJiNmFjMTQyOTJjMyIsInVzZXJJZCI6IlVzZXJ8ZjEzMDJkY2YtYTg4YS00MzYzLTk1YWItYjMwMDQ2M2ViOGI5IiwidXNlclByb2ZpbGVJZCI6Ik1QVXNlclByb2ZpbGU6ZmNlYTBjZTQ0YmQ4MzY3OTI4Y2I5NjE2N2QyMDUxN2FmMWZlOTRiMCIsImFwcElkIjoiaW8ubWFudXNjcmlwdHMiLCJlbWFpbCI6ImJvYjJAZXhhbXBsZS5jb20iLCJhdWQiOiJodHRwOi8vMC4wLjAuMDo4MDgwIiwiaXNzIjoiMTI3LjAuMC4xIiwiaWF0IjoxNjgxNzM0Nzc0fQ.Fu9gPINdeKm5jvXNWPhLK013VlJgjr1U8-p8vwpB1M4"

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2" \
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
  --data-binary "{\"_id\":\"MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2\"}" && \
  echo -e "\"MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2/manuscripts/MPManuscript:fd72fe79-8d7b-40f9-9b7b-8bfcdeddc7f6" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:fd72fe79-8d7b-40f9-9b7b-8bfcdeddc7f6\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/sample/big-fedotova.manuscript-json"
  # user_specific_zip_path="test/data/fixtures/sample/$user.manuscript-json"
  file_path="$parent_path/$zip_path"
  # user_specific_file_path="$parent_path/$user_specific_zip_path"

  # echo $user_specific_file_path

  # cp $file_path $user_specific_file_path
  # if [ "$(uname)" == "Darwin" ]; then
  #     sed -i '' "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:$user/g" $user_specific_file_path
  #     sed -i '' "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:$user/g" $user_specific_file_path
  # elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  #     sed -i "s/MPProject:B81D5F33-6338-420C-AAEC-CF0CF33E675C/MPProject:$user/g" $user_specific_file_path
  #     sed -i "s/MPManuscript:9E0BEDBC-1084-4AA1-AB82-10ACFAE02232/MPManuscript:$user/g" $user_specific_file_path
  # fi

  echo -e "@$file_path"

  curl "http://localhost:3000/api/v1/project/MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2/save" \
  --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$file_path" \

  # # rm $user_specific_file_path

  echo -e "Project\"MPProject:4831e2fe-e2c8-49d5-bfe0-99068de69af2\" seeded with a manuscript\n"

