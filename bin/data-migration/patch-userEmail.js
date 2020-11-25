#!/usr/bin/env node
const couchbase = require("couchbase");
const checksum = require("checksum");
// This line is needed to get the env locally
// require("dotenv").config();

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

async function getUsers() {
  return new Promise((resolve, reject) => {
    bucket.query(
      N1qlQuery.fromString(
        `SELECT email FROM ${process.env.APP_USER_BUCKET} WHERE _type = 'User';`
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

async function createUserEmail(email) {
  return new Promise((resolve, reject) => {
    const userEmailID = `UserEmail|${checksum(email, { algorithm: "sha1" })}`;
    bucket.query(
      N1qlQuery.fromString(
        `INSERT INTO ${process.env.APP_USER_BUCKET} (KEY, VALUE) VALUES ($1, { '_id': $1, '_type': $2 } );`
      ),
      [userEmailID, "UserEmail"],
      (error) => {
        if (error) {
          return reject(error);
        }
        return resolve();
      }
    );
  });
}

async function createUserEmails() {
  const users = await getUsers();

  for (let user of users) {
    await createUserEmail(user.email)
      .then(() => console.log(`Created ${user.email}`))
      .catch((e) => console.log(e));
  }
}

createUserEmails().then(() => process.exit(0));
