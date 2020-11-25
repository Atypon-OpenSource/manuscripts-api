#!/usr/bin/env node
const request = require("request");
const checksum = require("checksum");
const couchbase = require("couchbase");
const argv = require("yargs").argv;

const sgBucketsList = [argv.dataBucket, argv.derivedBucket];

const cluster = new couchbase.Cluster(argv.dbURI);
cluster.authenticate(argv.cbUser, argv.cbPass.toString());

const bucket = cluster.openBucket(argv.stateBucket);
bucket.on("error", function(error) {
  console.log(error);
  process.exit(-1);
});

const N1qlQuery = couchbase.N1qlQuery;
let done = 0;

function bringOnline(bucketName, uri, checksum) {
  request.post(
    uri + "/_online",
    {
      json: true
    },
    function(err, _result) {
      if (err) {
        console.log("_online failed: " + err);
        process.exit(-1);
      }

      console.log(bucketName + " back online");
      if (checksum) {
        bucket.upsert(
          bucketName + "-sync-function-checksum",
          {
            checksum: checksum
          },
          function(_err, _res) {
            console.log(bucketName + " updated checksum successfully");
            done++;
            if (done === sgBucketsList.length) {
              process.exit(0);
            }
          }
        );
      }
    }
  );
}

for (let bucketName of sgBucketsList) {
  const uri =
    "http://" + argv.sgHostname + ":" + argv.sgPort + "/" + bucketName;
  let latestChecksum = null;

  if (argv.bringOnlineOnly) {
    bringOnline(bucketName, uri, latestChecksum);
  }

  request(uri + "/_config", { json: true }, function(err, _res, body) {
    if (err) {
      console.log("_config failed: " + err);
      process.exit(-1);
    }

    latestChecksum = checksum(body.sync, { algorithm: "sha256" });

    bucket.manager().createPrimaryIndex(function() {
      bucket.query(
        N1qlQuery.fromString(
          "SELECT * FROM " +
            argv.stateBucket +
            ' WHERE META().id = "' +
            bucketName +
            '-sync-function-checksum"'
        ),
        function(_err, results) {
          const currentChecksum =
            results && results.length ? results[0]["state"].checksum : "";

          if (currentChecksum !== latestChecksum) {
            request
              .post(uri + "/_offline", { json: true }, function(err, _res) {
                if (err) {
                  console.log("_offline failed: " + err);
                  process.exit(-1);
                }

                console.log(bucketName + " bucket is offline");
              })
              .pipe(
                request.post(uri + "/_resync", { json: true }, function(
                  err,
                  _res
                ) {
                  if (err) {
                    console.log("_resync failed: " + err);
                    process.exit(-1);
                  }

                  console.log(bucketName + " bucket resynced successfully");
                  bringOnline(bucketName, uri, latestChecksum);
                })
              );
          } else {
            done++;
            if (done === sgBucketsList.length) {
              process.exit(0);
            }
          }
        }
      );
    });
  });
}
