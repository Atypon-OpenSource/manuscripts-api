/*!
 * © 2020 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ConfigurationContainer } from '../../src/Config/ConfigurationTypes'

jest.mock('../../src/Config/Config', () => {
  const config: ConfigurationContainer = {
    DB: {
      buckets: {
        user: 'manuscripts_user',
        data: 'bkt',
        state: 'state',
        derivedData: 'derived_data',
        discussions: 'discussions'
      },
      initializeContents: false,
      username: 'Administrator',
      password: '123456',
      bucketAdminPassword: 'zuippadui',
      uri: 'couchbase://couchbase/',
      bucketOptions: {},
      startFunctionService: false
    },
    gateway: {
      hostname: 'sync_gateway',
      ports: {
        admin: '4985',
        public: '4984'
      },
      cookieDomain: '127.0.0.1'
    },
    AWS: {
      accessKeyId: 'made-up-access-key-id',
      secretAccessKey: 'made-up-secret-access-key',
      region: 'made-up-region'
    },
    API: {
      port: 3000,
      oauthStateEncryptionKey: 'key-12345',
      hostname: 'https://api-server.atypon.com'
    },
    auth: {
      jwtSecret: '123456',
      skipVerification: false,
      hashSaltRounds: 3,
      serverSecret: '123456789',
      enableNonConnectAuth: true
    },
    discourse: {
      ssoSecret: '123456',
      url: 'https://community.manuscripts.io',
      adminUsername: 'discourse-admin',
      apiKey: '123456',
      feedbackCategoryID: '123'
    },
    google: {
      clientID: 'herp',
      clientSecret: 'derp',
      authCallback: 'the-google-callback'
    },
    IAM: {
      clientID: 'test',
      authServerURL: 'https://iam-test.atypon.com/IAM',
      authCallbackPath: 'https://iam-test.atypon.com/callback',
      libraryURL: 'https://iam-test.atypon.com/library',
      apiServerURL: 'https://iam-test.atypon.com/api-server',
      authServerPermittedURLs: ['https://iam-test.atypon.com']
    },
    email: {
      fromAddress: 'no-reply@manuscriptsapp.com',
      fromBaseURL: 'http://localhost:3000'
    },
    server: {
      storeOnlySSLTransmittedCookies: true,
      allowedCORSOrigins: ['http://localhost:8080']
    },
    literatum: {
      allowedIPAddresses: ['localhost']
    },
    apps: {
      knownClientApplications: [
        {
          _id: 'ClientApplication|com.manuscripts.Manuscripts',
          _type: 'ClientApplication',
          secret: 'foobar',
          name: 'Manuscripts'
        }
      ]
    },
    scopes: [
      {
        name: 'jupyterhub',
        secret: 'madeup-secret',
        publicKeyPEM: null,
        publicKeyJWK: null,
        expiry: 15,
        identifier: 'derp'
      },
      {
        name: 'file-picker',
        secret: 'random-secret',
        publicKeyPEM: null,
        publicKeyJWK: null,
        expiry: 15,
        identifier: 'iden'
      }
    ],

    pressroom: {
      baseurl: 'https://pressroom-js-dev.manuscripts.io',
      apiKey: 'something-random'
    },

    template: {
      allowedOwners: []
    },
    createBucketOptions: () => {
      return {}
    }
  }

  const Environment = {
    Test: 'test',
    Development: 'development',
    Production: 'production'
  }

  return {
    config,
    Environment,
    BucketKey: {
      User: 'user',
      Data: 'data'
    }
  }
})
