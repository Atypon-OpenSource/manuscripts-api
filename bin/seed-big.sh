#!/bin/bash

users=(bob2)

emails=("${users[@]/%/@example.com}")

# create two users
  user="bob2"
  email="bob@example.com"
  token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiZThlMzZkMzJlNjUwZDdkM2QyNTA1NmFlMmE4NGJiNmFjMTQyOTJjMyIsInVzZXJJZCI6IlVzZXJ8ZjEzMDJkY2YtYTg4YS00MzYzLTk1YWItYjMwMDQ2M2ViOGI5IiwidXNlclByb2ZpbGVJZCI6Ik1QVXNlclByb2ZpbGU6ZmNlYTBjZTQ0YmQ4MzY3OTI4Y2I5NjE2N2QyMDUxN2FmMWZlOTRiMCIsImFwcElkIjoiaW8ubWFudXNjcmlwdHMiLCJlbWFpbCI6ImJvYjJAZXhhbXBsZS5jb20iLCJhdWQiOiJodHRwOi8vMC4wLjAuMDo4MDgwIiwiaXNzIjoiMTI3LjAuMC4xIiwiaWF0IjoxNjgxNzM0Nzc0fQ.Fu9gPINdeKm5jvXNWPhLK013VlJgjr1U8-p8vwpB1M4"

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e" \
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
  --data-binary "{\"_id\":\"MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e\"}" && \
  echo -e "\"MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e/manuscripts/MPManuscript:df7d82ce-e66f-402a-9015-637248ba4cbc" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:df7d82ce-e66f-402a-9015-637248ba4cbc\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/sample/big-athena.manuscript-json"
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

  curl "http://localhost:3000/api/v1/project/MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e/save" \
  --fail-with-body \
  -H 'Content-Type: application/json' \
  -H 'content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$file_path" \

  # # rm $user_specific_file_path

  echo -e "Project\"MPProject:c4855a02-050a-452c-af9d-3a2e4501a96e\" seeded with a manuscript\n"

