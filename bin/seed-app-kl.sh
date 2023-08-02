#!/bin/bash

users=(bob2)

emails=("${users[@]/%/@example.com}")

# create two users
  user="bob2"
  email="bob@example.com"
  token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiY2I3MTk1YTg0OGUzNDg3ZGYwMGNkMWIyZTYzZWJiNDVkZjNiYjVmNCIsInVzZXJJZCI6IlVzZXJ8ZjEzMDJkY2YtYTg4YS00MzYzLTk1YWItYjMwMDQ2M2ViOGI5IiwidXNlclByb2ZpbGVJZCI6Ik1QVXNlclByb2ZpbGU6ZmNlYTBjZTQ0YmQ4MzY3OTI4Y2I5NjE2N2QyMDUxN2FmMWZlOTRiMCIsImFwcElkIjoiaW8ubWFudXNjcmlwdHMiLCJlbWFpbCI6ImJvYjJAZXhhbXBsZS5jb20iLCJhdWQiOiJodHRwOi8vMC4wLjAuMDo4MDgwIiwiaXNzIjoiMTI3LjAuMC4xIiwiaWF0IjoxNjgxNzM0NzM0fQ.3EeBviRgPhaHg4_VKPxWR3Aj5-ohedzDIMtFv3xE7KU"

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:lost-keywords" \
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
  --data-binary "{\"_id\":\"MPProject:lost-keywords\"}" && \
  echo -e "\"MPProject:lost-keywords\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:lost-keywords/manuscripts/MPManuscript:lost-kwds" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:lost-kwds\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/sample/keyword-lost.manuscript-json"
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

  curl "http://localhost:3000/api/v1/project/MPProject:lost-keywords/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$file_path" \

  # # rm $user_specific_file_path

  echo -e "Project\"MPProject:lost-keywords\" seeded with a manuscript\n"

