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
import { defineGlobals } from '../../src/define-globals'
defineGlobals()
import { ConfigurationContainer } from '../../src/Config/ConfigurationTypes'

jest.mock('../../src/Config/Config', () => {
  const config: ConfigurationContainer = {
    API: {
      port: 3000,
      oauthStateEncryptionKey: 'key-12345',
      hostname: 'https://api-server.atypon.com',
    },
    auth: {
      jwtSecret: '123456',
      skipVerification: false,
      hashSaltRounds: 3,
      serverSecret: '123456789',
      enableNonConnectAuth: true,
    },
    email: {
      fromBaseURL: 'http://localhost:3000',
    },
    server: {
      allowedCORSOrigins: ['http://localhost:8080'],
    },
    data: {
      path: __dirname + '/../../data',
    },
  }

  const Environment = {
    Test: 'test',
    Development: 'development',
    Production: 'production',
  }

  return {
    config,
    Environment,
    BucketKey: {
      User: 'user',
      Data: 'data',
    },
  }
})
