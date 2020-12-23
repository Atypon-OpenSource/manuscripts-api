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

import * as jsonwebtoken from 'jsonwebtoken'
import checksum from 'checksum'

import { User, SignupCredentials, ConnectSignupCredentials } from '../../Models/UserModels'
import { SingleUseTokenType } from '../../Models/SingleUseTokenModels'
import {
  ConflictingRecordError,
  NoTokenError,
  UnexpectedUserStatusError,
  InvalidCredentialsError,
  RecordNotFoundError,
  ValidationError,
  ConflictingUnverifiedUserExistsError,
  InvalidServerCredentialsError,
  DuplicateEmailError
} from '../../Errors'
import { IUserRegistrationService } from './IUserRegistrationService'
import { ISyncService } from '../Sync/ISyncService'
import { GATEWAY_BUCKETS } from '../Sync/SyncService'
import { ISingleUseTokenRepository } from '../../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { AuthService } from '../Auth/AuthService'
import { config } from '../../Config/Config'
import { BucketKey } from '../../Config/ConfigurationTypes'
import { getExpirationTime } from '../../Utilities/JWT/LoginTokenPayload'
import { EmailService } from '../Email/EmailService'
import { IUserEmailRepository } from '../../DataAccess/Interfaces/IUserEmailRepository'

/** Account verification token timeout. */
const VERIFICATION_TOKEN_TIMEOUT = () => getExpirationTime(24)

export class UserRegistrationService implements IUserRegistrationService {
  constructor (
    private userRepository: IUserRepository,
    private userEmailRepository: IUserEmailRepository,
    private emailService: EmailService,
    private singleUseTokenRepository: ISingleUseTokenRepository,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private syncService: ISyncService
  ) {}

  public async connectSignup (credentials: ConnectSignupCredentials): Promise<void> {
    const { email, name, connectUserID } = credentials

    const user = await this.userRepository.getOne({
      email
    })

    if (user) {
      throw new ConflictingRecordError('User email already exists', user.email)
    }

    try {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.create({ _id: userEmailID }, {})
    } catch (error) {
      throw new DuplicateEmailError(`Email ${email} is not available`)
    }

    const newUser = await this.userRepository.create({ email, name, connectUserID }, {})

    await Promise.all(
      GATEWAY_BUCKETS.map(key =>
        this.syncService.createGatewayAccount(newUser._id, key)
      )
    )
    await this.syncService.createGatewayContributor(newUser, BucketKey.Data)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      newUser._id,
      UserActivityEventType.Registration,
      null,
      null
    ) // intentional fire and forget.
  }

  public async signup (credentials: SignupCredentials): Promise<void> {
    const { token, email, name, password } = credentials
    if (token) {
      try {
        jsonwebtoken.verify(token, config.auth.serverSecret)
      } catch (e) {
        throw new InvalidServerCredentialsError(
          `Invalid token during registration attempt on behalf of user '${email}'`
        )
      }
    } else {
      AuthService.ensureNonConnectAuthEnabled()
    }

    const skipVerification = token ? true : config.auth.skipVerification

    const user = await this.userRepository.getOne({
      email
    })

    if (user) {
      await this.handleUserExistence(user)
    }

    try {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.create({ _id: userEmailID }, {})
    } catch (error) {
      throw new DuplicateEmailError(`Email ${email} is not available`)
    }

    const newUser = await this.userRepository.create({ email, name }, {})

    await Promise.all(
      GATEWAY_BUCKETS.map(key =>
        this.syncService.createGatewayAccount(newUser._id, key)
      )
    )
    await this.syncService.createGatewayContributor(newUser, BucketKey.Data)

    await this.userStatusRepository.create(
      {
        _id: newUser._id,
        blockUntil: null,
        isVerified: skipVerification,
        password: password ? await AuthService.createPassword(password) : '',
        createdAt: new Date(),
        deviceSessions: {}
      },
      {}
    )

    if (!skipVerification) {
      await this.sendAccountVerification(newUser)
    }

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      newUser._id,
      UserActivityEventType.Registration,
      null,
      null
    ) // intentional fire and forget.
  }

  private userEmailID (email: string) {
    return checksum(email, { algorithm: 'sha1' })
  }

  private async handleUserExistence (user: User) {
    const userStatus = await this.userStatusRepository.statusForUserId(
      user._id
    )

    if (!userStatus) {
        // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
          user._id,
          UserActivityEventType.StatusNotFound,
          null,
          null
        )
      throw new UnexpectedUserStatusError('User status not found', user)
    }

    if (userStatus.isVerified) {
      throw new ConflictingRecordError('User already exists', user)
    } else {
      throw new ConflictingUnverifiedUserExistsError(
        'User already exists but not verified',
        user
      )
    }
  }

  public async sendAccountVerification (user: User) {
    const tokenId = await this.singleUseTokenRepository.ensureTokenExists(user, SingleUseTokenType.VerifyEmailToken, VERIFICATION_TOKEN_TIMEOUT())
    await this.emailService.sendAccountVerification(user, tokenId)
  }

  public async verify (tokenId: string): Promise<void> {
    const userVerificationToken = await this.singleUseTokenRepository.getById(tokenId)

    if (!userVerificationToken) {
      throw new NoTokenError(tokenId)
    }

    await this.singleUseTokenRepository.remove({ userId: userVerificationToken.userId , tokenType: userVerificationToken.tokenType })
    const user = await this.userRepository.getById(userVerificationToken.userId)
    if (!user) {
      throw new InvalidCredentialsError('User not found')
    }

    await this.userStatusRepository.patchStatusWithUserId(user._id, { isVerified: true }, {})

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(userVerificationToken.userId, UserActivityEventType.EmailVerified, null, null) // intentional fire and forget.
  }

  public async requestVerificationEmail (email: string): Promise<void> {
    const user = await this.userRepository.getOne({ email: email.toLowerCase() })
    if (!user) {
      throw new RecordNotFoundError('User not found')
    }
    const userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus) {
      throw new UnexpectedUserStatusError('User not found', user)
    }

    if (userStatus.isVerified) {
      throw new ValidationError('User email address already verified', null)
    }

    await this.sendAccountVerification(user)
    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(user._id, UserActivityEventType.RequestEmailVerification, null, null) // intentional fire and forget.
  }
}
