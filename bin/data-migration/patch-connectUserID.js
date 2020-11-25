#!/usr/bin/env node
const request = require("request-promise-native");
const couchbase = require("couchbase");
const jsonwebtoken = require("jsonwebtoken");
const args = require("minimist")(process.argv.slice(2));
// This line is needed to get the env locally
// require('dotenv').config()

const cluster = new couchbase.Cluster(process.env.APP_DB_URI);
cluster.authenticate(
  process.env.APP_COUCHBASE_ADMIN_USER,
  process.env.APP_COUCHBASE_ADMIN_PASS
);

const bucket = cluster.openBucket(process.env.APP_USER_BUCKET);
const N1qlQuery = couchbase.N1qlQuery;

bucket.on("error", function (error) {
  console.log(error);
  process.exit(-1);
});

function isValidEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const basicToken = Buffer.from(
  `${process.env.APP_IAM_CLIENT_ID}:${process.env.APP_IAM_CLIENT_SECRET}`
).toString("base64");

async function getUsers() {
  return new Promise((resolve, reject) => {
    bucket.query(
      N1qlQuery.fromString(
        `SELECT _id, email FROM ${
          process.env.APP_USER_BUCKET
        } WHERE _type = 'User' ${
          args.onlyMissing ? "AND connectUserID IS MISSING" : ""
        }`
      ),
      async (error, results) => {
        if (error) {
          return reject(error);
        }

        return resolve(results);
      }
    );
  });
}

async function patchConnectUserID(connectUserID, userID) {
  return new Promise((resolve, reject) => {
    bucket.query(
      N1qlQuery.fromString(
        `UPDATE ${process.env.APP_USER_BUCKET} SET connectUserID = $1 WHERE _type = 'User' AND META().id = $2`
      ),
      [connectUserID, userID],
      (error) => {
        if (error) {
          return reject(error);
        }
        return resolve();
      }
    );
  });
}

async function patchUsers() {
  const users = await getUsers();

  for (let user of users) {
    const userEmail = user.email;
    if (!isValidEmail(userEmail)) {
      console.log(`${userEmail} is not a valid email.`);
      continue;
    }

    const userID = user._id;
    const response = await request.get(
      `${
        process.env.APP_IAM_SERVER_URL
      }/api/rest/user?email=${encodeURIComponent(userEmail)}`,
      {
        json: true,
        headers: {
          authorization: `Basic ${basicToken}`,
        },
        simple: false,
        resolveWithFullResponse: true,
      }
    );

    if (response.statusCode !== 200) {
      console.log(
        `Request faild for email = ${userEmail} 
        error = ${response.error} 
        request.body = ${request.body}.`
      );
      continue;
    }

    const connectToken = jsonwebtoken.decode(response.body);
    if (!connectToken || !connectToken.sub) {
      console.log(
        `Token does not contain sub for user with email: ${userEmail}.`
      );
      continue;
    }
    try {
      await patchConnectUserID(connectToken.sub, userID);
      console.log(`Updated user: ${userID}.`);
    } catch (e) {
      console.log(`Update for user: ${userID} has failed.`);
    }
  }
}

patchUsers().then(() => process.exit(0));
