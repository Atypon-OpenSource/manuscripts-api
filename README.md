# manuscripts.io

## Requirements

* [Node.js](https://nodejs.org/)
* [Yarn](https://yarnpkg.com/)
* [Docker](https://www.docker.com/)


## Installation

```sh
npm install
```

Configuration variables should be set in `.env`

## Run the app

Run Couchbase, Sync Gateway and API server in Docker:

```
./bin/run-dockerized-app.sh
```

Once the database is ready, the API will be available at <http://127.0.0.1:3000/>

**NOTE!** If running the above command on macOS or Windows, check that your Docker installation is granted more than 2GB of a RAM quota (Preferences > Advanced > Memory).
Otherwise you may see cryptic error messages from manuscripts-api attempting to connect to the database stating "Operation not supported".

Minimum requirements: Node v8.0 or later (for production use v8 is recommended, but 9 and 10 also work).

## Test the app

Run Couchbase, Sync Gateway and the test runner in Docker:

```
./bin/run-dockerized-tests.sh
```

Run Couchbase and Sync Gateway in Docker, and run the tests locally:

```
./bin/run-dockerized-db+sg.sh
npm run test
```

You may need to edit your hosts file:

```
127.0.0.1 couchbase
127.0.0.1 sync_gateway
```

## Development

Run Couchbase and Sync Gateway in Docker, and run the API server locally:

```
./bin/run-dockerized-db+sg.sh
npm run dev
```

## Debugging with VS Code

Run Couchbase and Sync Gateway in Docker, and run the tests locally:

```
./bin/run-dockerized-db+sg.sh
```

You will now be able to use of the three launch configurations for VS Code:

- "Launch": runs the API server locally in the debugger.
- "Unit Tests": runs unit tests in the debugger.
- "Integration Tests": runs  integration tests in the debugger.

All of these launch configurations take the `.env.example` environment variables
and modify them to prepare the environment for local execution.

## Developer Notes

When a new environment/configuration variable is added in the code, make sure to add it to the following places:

a) In `.env.example` file

b) In `docker/utils/templates/docker-compose.yml.ejs`file. Make sure to add it under respective service as well as under `test_runner` configuration

c) In CI Pipeline setting's -> "Environment variables" section, add a new environment variable with appropriate value

## Initializing required database state

For correct behaviour, manuscripts-api requires an initialization step. At that time of writing, the resources initialized include [GSI database indices](https://docs.couchbase.com/server/6.0/learn/services-and-indexes/indexes/global-secondary-indexes.html), [map-reduce views](https://docs.couchbase.com/server/4.1/developer-guide/views-intro.html) and [eventing functions](https://docs.couchbase.com/server/current/eventing/eventing-overview.html).

Two configuration variables control the initialization time behaviour:

- `APP_INITIALIZE`: when set to value `1`, initialization is done before either quitting or starting up listening to the specified HTTP port (specified with `APP_PORT`). When set to `0`, no initialization is done.
- `APP_RUN_AFTER_INITIALIZE`: determines whether to quit after an initialization was done.

Editing this variables is not commonly necessary for local development purposes because the scripts under `bin` take care of setting the above variables to appropriate values. You will need to adjust them for production purposes.

## Resyncing Database

To resync the database there is a script inside `./bin` folder `resync-db.js`, and a shell script (`resync-db.sh`) that calls the earlier and provides the required environment veriables, running this shell script will do the job.

## Data Migration

For this purpose there is a folder inside bin `./bin/data-migration` which contains the data migration js scripts: 
-  `patch-connectUserID.js` which will update all the connectUserIDs, add --onlyMissing flag to patch only the missing once.

## Eventing Function Re-Deployment

To redeploy an eventing function you need to:

1. Access Couchbase Admin UI portal.
2. On the sidebar open eventing.
3. You will see all the eventing functions, click undeploy on the function you want to redeploy.
4. After the undeployment finishes, you will be allowed to change the function and then click deploy.
5. You will be shown 2 choices, `Everything` and `From now`, `Everything` will run through all the already existing objects and will run them through the function, while `From now` will just deploy the function.
6. Wait until bootstrapping ends.

## Configuration

The service is configured using environment variables and/or a [.env](https://github.com/motdotla/dotenv) file
placed at the root of the repository.

<dl>
  <dt>APP_COUCHBASE_ADMIN_USER</dt>
  <dd>Database server admin username, used internally by the service when making database calls.</dd>

  <dt>APP_COUCHBASE_ADMIN_PASS</dt>
  <dd>Database server admin password, used internally by the service when making database calls.</dd>

  <dt>APP_BASE_URL</dt>
  <dd>The *client* app base URL (the manuscripts-frontend instance) corresponding to this service.</dd>

  <dt>APP_AWS_ACCESS_KEY_ID</dt>
  <dd>The AWS access key (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_AWS_REGION</dt>
  <dd>The AWS region (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_AWS_SECRET_ACCESS_KEY</dt>
  <dd>The AWS secret access key (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_COUCHBASE_HOSTNAME</dt>
  <dd>The Couchbase server hostname (used by manuscripts-api and Sync Gateway when constructing connection URLs).</dd>

  <dt>APP_DB_URI</dt>
  <dd>The database connection base URI (e.g. "couchbase://couchbase/"). <b>NOTE!</b> Needs to be kept consistent with <pre>$APP_COUCHBASE_HOSTNAME</pe> with which it is partially redundant with.</dd>

  <dt>APP_GATEWAY_HOSTNAME</dt>
  <dd>The Sync Gateway hostname, used by manuscripts-api in constructing connection URLs to Sync Gateway.</dd>

  <dt>APP_FROM_EMAIL</dt>
  <dd>The email address from which emails sent by the service are sent.</dd>

  <dt>APP_GATEWAY_ADMIN_PORT</dt>
  <dd>The port for the Sync Gateway <a href="https://developer.couchbase.com/documentation/mobile/current/references/sync-gateway/admin-rest-api/index.html?v=2.0">admin interface</a> (by default 4985).</dd>

  <dt>APP_GATEWAY_PUBLIC_PORT</dt>
  <dd>The port to the Sync Gateway <a href="https://developer.couchbase.com/documentation/mobile/current/references/sync-gateway/rest-api/index.html?v=2.0">public interface</a> (by default 4984).</dd>

  <dt>APP_GOOGLE_AUTH_CALLBACK</dt>
  <dd>The Google OAuth2 API callback (e.g. <b>"https://api.manuscripts.io/api/v1/auth/google/callback"</b>).</dd>

  <dt>APP_GOOGLE_CLIENT_ID</dt>
  <dd>The Google OAuth2 client ID</dd>

  <dt>APP_GOOGLE_CLIENT_SECRET</dt>
  <dd>The Google OAuth2 client secret</dd>

  <dt>APP_JWT_SECRET</dt>
  <dd>A cryptographic secret used for JWT signatures.</dd>

  <dt>APP_OAUTH_STATE_ENCRYPTION_KEY</dt>
  <dd>A cryptographic secret used for the  'state' parameter posted to OAuth providers.</dd>

  <dt>APP_PORT</dt>
  <dd>The port to which the service should bind to serve from.</dd>

  <dt>APP_COUCHBASE_RBAC_PASSWORD</dt>
  <dd>A password for a special bucket administrator user that the service uses through Sync Gateway for administrative purposes.</dd>

  <dt>APP_CLIENT_APPLICATIONS</dt>
  <dd>A semi-colon separated list of acceptable client details, with each field comma separated including an optional secret. It corresponds to Application Id, Application Secret, Application Name. (e.g. <b>"com.manuscripts.Manuscripts,foobar,Manuscripts;io.manuscripts,,Manuscripts.io"</b>).</dd>

  <dt>APP_STATE_BUCKET</dt>
  <dd>The name for a database bucket for internal service state.</dd>

  <dt>APP_USER_BUCKET</dt>
  <dd>The name of a database bucket for user account credentials and other user auth state.</dd>

  <dt>APP_DATA_BUCKET</dt>
  <dd>The name of a database bucket for user owned project data.</dd>

  <dt>APP_DERIVED_DATA_BUCKET</dt>
  <dd>The name of a database bucket for secondary data derived from data in <pre>$APP_DATA_BUCKET</pre>.</dd>

  <dt>APP_DISCUSSIONS_BUCKET</dt>
  <dd>The name of a database bucket for saving comments and annotations data.</dd>

  <dt>NODE_ENV</dt>
  <dd>Express.js specific environment variable whose acceptable values are enforced by manuscripts-api to be "development" and "production" (see <a href="https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production">Express.js docs</a> re production specific behaviour).</dd>

  <dt>APP_STORE_ONLY_SSL_TRANSMITTED_COOKIES<dt>
  <dd>If set to '0', cookies transmitted over SSL encrypted connections will be stored (see <a href="https://expressjs.com/en/advanced/best-practice-security.html#use-cookies-securely">"Set cookie security options"</a> in Express.js documentation for more info), also the samesite cookie will be Strict</dd>

  <dt>APP_ALLOWED_CORS_ORIGINS</dt>
  <dd>Allowed CORS origins for manuscripts-api and the Sync Gateway.</dd>

  <dt>APP_GATEWAY_COOKIE_DOMAIN</dt>
  <dd>The domain to which this manuscripts-api instance sets its Sync Gateway cookie domain for. for local development will set this to `localhost`</dd>

  <dt>APP_PROJECTS_GATEWAY_COOKIE_DOMAIN</dt>
  <dd>The domain at which Sync Gateway serves projects data at.</dd>

  <dt>APP_SKIP_ACCOUNT_VERIFICATION</dt>
  <dd>If set to '1', skip the account verification step at account creation.</dd>

  <dt>APP_INITIALIZE</dt>
  <dd>If set to '1' when executing with the manuscripts-api provided Docker container for the service  (which executes manuscripts-api through the docker/app/entry_point.sh script, the service will be brought up to initialise database state. Depending on value of <pre>$APP_RUN_AFTER_INITIALIZE</pre>, the contained application will exit after initialisation, or start serving at the <pre>$APP_PORT</pre>.</dd>

  <dt>APP_RUN_AFTER_INITIALIZE</dt>
  <dd>If set to '1' along with <pre>$APP_INITIALIZE</pre> being set to 1 with manuscripts-api executed through the provided Docker container, start serving at <pre>$APP_PORT</pre> after initialising database state. If <pre>$APP_INITIALIZE</pre> is set  to `1` and <pre>$APP_RUN_AFTER_INITIALIZE</pre> not, will exit after initialization. Has no effect if <pre>$APP_INITIALIZE</pre> is not set  to '1'.</dd>

  <dt>APP_ALLOW_ANONYMOUS_USERS</dt>
  <dd>If set to '1', enables endpoint for returning connection credentials (including a Sync Gateway session cookie) for an anonymous user.</dd>

  <dt>APP_HASH_SALT_ROUNDS</dt>
  <dd>An optional value for the bcrypt password salt rounds used for storing passwords.</dd>

  <dt>APP_CONTAINER_TOKEN_SCOPES</dt>
  <dd>An array of semicolon separated records to describe scopes for which the server can issue access tokens in JWT form: fields are comma separated, denoting for each record: scope name,UTF8 encoded secret or base64 encoded PEM formatted private key,empty string (if symmetric secret is used) or a base64 encoded PEM formatted public key,expiry in minutes</dd>

  <dt>APP_COUCHBASE_CLUSTER_ANTIAFFINITY</dt>
  <dd>When running Couchbase on Kubernetes using the autonomous Operator, this setting determines "whether or not two or more pods are allowed to be run on the same Kubernetes node". Quoting <a href="http://docs.couchbase.com/prerelease/couchbase-operator/beta/couchbaseClusterConfig.html#antiaffinity">Couchbase documentation on <b>antiAffinity</b></a> further: "In a production setting this parameter should always be set to true in order to reduce the chance of data loss in case a Kubernetes node crashes."</dd>

  <dt>APP_DISCOURSE_SSO_SECRET</dt>
  <dd>Secret used as part of Discourse SSO login request validation (see https://meta.discourse.org/t/official-single-sign-on-for-discourse-sso/13045 for details of this flow). The value is optional and only required by the `/api/v1/auth/discourseLogin` endpoint.</dd>

  <dt>APP_DISCOURSE_URL</dt>
  <dd>The base URL to a Discourse forum that this API server can be optionally linked with. The value is optional and only required by the `/api/v1/auth/discourseLogin` endpoint.</dd>
</dl>
