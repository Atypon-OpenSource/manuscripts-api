#!/usr/bin/env node

const process = require('process');
const { request } = require('http');
const { stringify } = require('querystring');

function doReq(opts) {
  return new Promise((resolve, reject) => {
    const req = request(opts, (res) => {
      res.setEncoding('utf8');
      let chunks = '';

      res.on('data', (chunk) => chunks += chunk);

      res.on('end', () =>
        resolve({
          body: JSON.parse(chunks),
          statusCode: res.statusCode
        })
      );
    });

    req.on('error', (e) => {
      reject(e.message);
    });

    req.end();
  });
}

function options (bucket) {
  return {
    auth: `${process.env.APP_COUCHBASE_ADMIN_USER}:${process.env.APP_COUCHBASE_ADMIN_PASS}`,
    hostname: process.env.APP_COUCHBASE_HOSTNAME,
    method: 'GET',
    port: 8093,
    path: '/query/service?' + stringify({
      statement: `SELECT _id FROM \`${bucket}\` USE KEYS ["_id"] LIMIT 1`
    })
  };
}

let retries = 120;

async function sleep (interval) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, interval * 1000);
  });
}

async function tryAccessN1QLService(bucket) {
  const opts = options(bucket);

  while (retries > 0) {
    const response = await doReq(opts);

    if (response.statusCode === 200 && response.body.status === 'success') {
      console.log(`Connected to "${bucket}" N1QL service`);
      process.exit(0);
    } else {
      await sleep(1);
      retries--;
    }
  }

  throw 'Failed to connect to N1QL service'
}

tryAccessN1QLService(process.argv[2]).catch((error) => {
  console.error(error);
  process.exit(1);
});
