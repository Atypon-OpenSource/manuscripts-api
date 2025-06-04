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

import passport from 'passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { config } from '../../Config/Config'
import { DIContainer } from '../../DIContainer/DIContainer'
import { log } from '../../Utilities/Logger'

export class JwtAuthStrategy {
  public static use(): void {
    const opts = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.auth.jwtSecret,
      issuer: config.API.hostname,
      audience: config.email.fromBaseURL,
    }
    passport.use(
      'jwt',
      new Strategy(opts, async (jwt, done) => {
        try {
          const id = jwt.userID || jwt.userId?.toString().replace('|', '_')
          const user = await DIContainer.sharedContainer.userClient.findByID(id)
          if (!user) {
            return done(null, false)
          }
          return done(null, user)
        } catch (error) {
          log.error('Error in JWT strategy', error)
          return done(null, false)
        }
      })
    )
  }
}
