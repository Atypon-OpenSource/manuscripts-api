#!/bin/bash

curl -o  response.txt 'http://localhost:3000/api/v1/auth/login' \
    --silent \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H 'manuscripts-app-id: io.manuscripts' \
    -H 'manuscripts-app-secret: Valid secret' \
    --data-binary "{\"email\":\"bob2@example.com\",\"password\":\"123123123\",\"deviceId\":\"deviceId1\"}"