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
import { Request } from 'express'
import { OAuth2Strategy, Profile } from 'passport-google-oauth'
import { AES, enc } from 'crypto-js'

import { AuthStrategyTypes } from './AuthStrategy'
import { config } from '../../Config/Config'
import { AuthState } from '../Interfaces/AuthState'
import { isString } from '../../util'
import { DIContainer } from '../../DIContainer/DIContainer'
import { InvalidClientApplicationStateError } from '../../Errors'

export function validateAndGetState (encryptedState: string): AuthState {
  const plainState = AES.decrypt(encryptedState, config.API.oauthStateEncryptionKey).toString(enc.Utf8)
  let state: any

  try {
    state = JSON.parse(plainState)
  } catch (error) {
    throw new InvalidClientApplicationStateError(plainState)
  }

  const { appId, deviceId, invitationId } = state

  if (!isString(appId) || !isString(deviceId)) {
    throw new InvalidClientApplicationStateError(state)
  }

  if (invitationId && !isString(invitationId)) {
    throw new InvalidClientApplicationStateError(state)
  }

  return {
    appId,
    deviceId,
    invitationId
  }
}

export class GoogleAuthStrategy {
  public static use (): void {
    const authService = DIContainer.sharedContainer.authService

    const opts = {
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.authCallback,
      passReqToCallback: true
    }

    passport.use(AuthStrategyTypes.google,
      new OAuth2Strategy(
        opts,
        async (req: Request,
           accessToken: string,
           refreshToken: string,
          profile: Profile,
          done: Function
        ) => {
          if (profile) {
            const email = profile.emails ? profile.emails[0].value : ''
            const firstName = profile.name ? profile.name.givenName : ''
            const lastName = profile.name ? profile.name.familyName : ''
            const encryptedState = req.query.state

            const state = validateAndGetState(encryptedState)
            const applicationRepository = DIContainer.sharedContainer.applicationRepository

            try {
              const application = await applicationRepository.getById(state.appId)
              if (!application) {
                return done(null, false)
              } else {
                const user = await authService.loginGoogle({ email: email.toLowerCase(), name: `${firstName} ${lastName}`.trim(), ...state, accessToken, refreshToken })
                return done(null, user)
              }
            } catch (error) {
              return done(error, null)
            }
          }
        }
      )
    )
  }
}
