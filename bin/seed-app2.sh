#!/bin/bash

users=(bob)

emails=("${users[@]/%/@example.com}")

# create two users
  user="bob"
  email="bob@example.com"
  token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiZDQ0ZWZmNDFlMzJiOWY0MjVjNzAxOTBkYTMyZGYwNTlkYTRhOTEzMCIsInVzZXJJZCI6IlVzZXJ8ODYyZmVhOTgtMThmZS00M2NhLWJkOWUtNzA4ZDEwYzgwZjFlIiwidXNlclByb2ZpbGVJZCI6Ik1QVXNlclByb2ZpbGU6NjkzMDEyZGJlNWFhODI2MTVhZWMzNjE2ZmRjYzc5ZDg5NWMyYmYyMiIsImFwcElkIjoiaW8ubWFudXNjcmlwdHMiLCJlbWFpbCI6ImJvYkBleGFtcGxlLmNvbSIsImF1ZCI6Imh0dHA6Ly8wLjAuMC4wOjgwODAiLCJpc3MiOiIxMjcuMC4wLjEiLCJpYXQiOjE2Njc0MTA1MTN9.SSpigEQKfJJUdymJi4uIHBsSiLg7kyWZkCdgisI-Zqs"

  echo -e "Token \"$token\" created\n"

  curl -X "DELETE" "http://localhost:3000/api/v1/container/MPProject:bibs" \
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
  --data-binary "{\"_id\":\"MPProject:bibs\"}" && \
  echo -e "\"MPProject:bibs\" created\n"

  curl  -X "POST" "http://localhost:3000/api/v1/container/projects/MPProject:bibs/manuscripts/MPManuscript:bibsm" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" && \
  echo -e "\"MPManuscript:bibsm\" created\n"

  parent_path=$(pwd)
  zip_path="test/data/fixtures/sample/seed-bibs.manuscript-json"
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

  curl "http://localhost:3000/api/v1/project/MPProject:bibs/save" \
  --fail \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, */*' \
  -H 'manuscripts-app-id: io.manuscripts' \
  -H 'manuscripts-app-secret: Valid secret' \
  -H "Authorization: Bearer $token" \
  --data "@$file_path" \

  # # rm $user_specific_file_path

  echo -e "Project\"MPProject:bibs\" seeded with a manuscript\n"

