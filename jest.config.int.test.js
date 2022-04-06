/*!
 * © 2022 Atypon Systems LLC
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
module.exports = {
  verbose: true,
  testURL: 'http://localhost',
  testEnvironment: 'node',
  testMatch: ['**/test/suites/integration/**/*.ts', '**/test/suites/unit+integration/**/*.ts'],
  testRunner: 'jest-circus/runner',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: 'coverage/int',
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 88,
      lines: 77,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/Config/*.ts',
    '!src/Errors.ts',
    '!src/Controller/V1/Project/ProjectController.ts',
    '!src/Controller/BaseController.ts',
    '!src/Controller/BaseRoute.ts',
    '!src/Controller/**/*Schema.ts',
    '!src/Auth/Passport/Google.ts',
    '!src/Auth/Passport/JWT.ts',
    '!src/Auth/Passport/Passport.ts',
    '!src/Auth/Passport/ScopedJWT.ts',
    '!src/Auth/V1/Interfaces',
    '!src/Controller/RouteLoader.ts',
    '!src/**/Interfaces/*',
    '!src/Server/**',
    '!src/Utilities/**',
    '!src/DataAccess/SQLDatabase.ts',
    '!src/DataAccess/DatabaseIndices.ts',
    '!src/DataAccess/QueryKind.ts',
    '!src/Auth/Passport/AuthStrategy.ts',
    '!src/Config/**',
    '!src/DIContainer/DIContainer.ts',
    '!src/DataAccess/EventingFunctions/*.ts',
    '!src/DataAccess/UserCollaboratorRepository/UserCollaboratorRepository.ts',
    '!src/DataAccess/ExternalFileRepository/ExternalFileRepository.ts',
    '!src/DomainServices/Shackles/ShacklesService.ts',
  ],
  globalSetup: './test/utilities/globalSetup.js',
}
