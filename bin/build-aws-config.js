#!/usr/bin/env node

console.log(JSON.stringify({
  "accessKeyId" : process.env.APP_AWS_ACCESS_KEY_ID,
  "secretAccessKey" : process.env.APP_AWS_SECRET_ACCESS_KEY,
  "region" : process.env.APP_AWS_REGION
}, null, 4))