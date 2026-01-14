/*!
 * © 2026 Atypon Systems LLC
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
export const config = {
  debug: process.env.FORCE_DEBUG == '1',
  server: {
    hostname: process.env.APP_HOSTNAME_PUBLIC ?? '',
    port: Number(process.env.APP_PORT),
    secret: process.env.APP_SERVER_SECRET ?? '',
    origins: process.env.APP_ALLOWED_CORS_ORIGINS?.split(';') ?? [],
  },
  jwt: {
    audience: process.env.APP_HOSTNAME_PUBLIC ?? '',
    issuer: process.env.APP_HOSTNAME_PUBLIC ?? '',
    duration: '1800s',
    secret: process.env.APP_JWT_SECRET ?? '',
  },
  data: {
    paths: process.env.DATA_PATH?.split(';') ?? [],
  },
}
