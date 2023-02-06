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
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt'

import { config } from '../../Config/Config'
import { ScopedAccessTokenConfiguration } from '../../Config/ConfigurationTypes'
import { DIContainer } from '../../DIContainer/DIContainer'
import { AuthStrategyTypes } from './AuthStrategy'

class ScopedJwtAuthStrategy {
  public static use(options: ArchiveOptions): void {
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: [options.scope.publicKeyPEM === null ? 'HS256' : 'RS256'],
      audience: options.scope.name,
      issuer: config.API.hostname,
      secretOrKey: options.scope.secret,
    }

    passport.use(
      AuthStrategyTypes.scopedJwt,
      new Strategy(opts, async (payload, done) => {
        const user = await DIContainer.sharedContainer.userRepository.getById(
          payload.sub.replace('_', '|')
        )
        if (!user) {
          return done(null, false)
        }
        return done(null, user)
      })
    )
  }
}

export interface ArchiveOptions {
  scope: ScopedAccessTokenConfiguration
}

export { ScopedJwtAuthStrategy }
