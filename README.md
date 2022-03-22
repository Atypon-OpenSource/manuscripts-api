# manuscripts.io

## Requirements

* [Node.js](https://nodejs.org/)
* [Docker](https://www.docker.com/)


## Installation

```sh
npm install
```

Configuration variables should be set in `.env`

## Run the app

Run Postgres and API server in Docker:

```
./bin/run-dockerized-app.sh
```

The API will be available at <http://127.0.0.1:3000/>

## Test the app

Run Postgres and the test runner in Docker:

```
./bin/run-dockerized-tests.sh
```

Run Postgres in Docker, and run the tests locally:

```
./bin/run-dockerized-db.sh
npm run test
```

You may need to edit your hosts file:

```
127.0.0.1 postgres
```

## Development

Run Postgres in Docker, and run the API server locally:

```
./bin/run-dockerized-db.sh
npm run dev
```

## Debugging with VS Code

Run Postgres in Docker, and run the tests locally:

```
./bin/run-dockerized-db.sh
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

## Configuration

The service is configured using environment variables and/or a [.env](https://github.com/motdotla/dotenv) file
placed at the root of the repository.

<dl>
  <dt>APP_BASE_URL</dt>
  <dd>The *client* app base URL (the manuscripts-frontend instance) corresponding to this service.</dd>

  <dt>APP_AWS_ACCESS_KEY_ID</dt>
  <dd>The AWS access key (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_AWS_REGION</dt>
  <dd>The AWS region (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_AWS_SECRET_ACCESS_KEY</dt>
  <dd>The AWS secret access key (used by system when accessing Amazon SES to send emails).</dd>

  <dt>APP_FROM_EMAIL</dt>
  <dd>The email address from which emails sent by the service are sent.</dd>

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

  <dt>NODE_ENV</dt>
  <dd>Express.js specific environment variable whose acceptable values are enforced by manuscripts-api to be "development" and "production" (see <a href="https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production">Express.js docs</a> re production specific behaviour).</dd>

  <dt>APP_STORE_ONLY_SSL_TRANSMITTED_COOKIES<dt>
  <dd>If set to '0', cookies transmitted over SSL encrypted connections will be stored (see <a href="https://expressjs.com/en/advanced/best-practice-security.html#use-cookies-securely">"Set cookie security options"</a> in Express.js documentation for more info), also the samesite cookie will be Strict</dd>

  <dt>APP_ALLOWED_CORS_ORIGINS</dt>
  <dd>Allowed CORS origins for manuscripts-api and the Sync Gateway.</dd>

  <dt>APP_SKIP_ACCOUNT_VERIFICATION</dt>
  <dd>If set to '1', skip the account verification step at account creation.</dd>

  <dt>APP_ALLOW_ANONYMOUS_USERS</dt>
  <dd>If set to '1', enables endpoint for returning connection credentials (including a Sync Gateway session cookie) for an anonymous user.</dd>

  <dt>APP_HASH_SALT_ROUNDS</dt>
  <dd>An optional value for the bcrypt password salt rounds used for storing passwords.</dd>

  <dt>APP_CONTAINER_TOKEN_SCOPES</dt>
  <dd>An array of semicolon separated records to describe scopes for which the server can issue access tokens in JWT form: fields are comma separated, denoting for each record: scope name,UTF8 encoded secret or base64 encoded PEM formatted private key,empty string (if symmetric secret is used) or a base64 encoded PEM formatted public key,expiry in minutes</dd>

</dl>