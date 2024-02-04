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

import checksum from 'checksum'
import jwt from 'jsonwebtoken'

import { config } from '../../Config/Config'
import { ISingleUseTokenRepository } from '../../DataAccess/Interfaces/ISingleUseTokenRepository'
import { IUserEmailRepository } from '../../DataAccess/Interfaces/IUserEmailRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { IUserStatusRepository } from '../../DataAccess/Interfaces/IUserStatusRepository'
import {
  ConflictingRecordError,
  ConflictingUnverifiedUserExistsError,
  DuplicateEmailError,
  InvalidCredentialsError,
  InvalidServerCredentialsError,
  MissingUserRecordError,
  MissingUserStatusError,
  NoTokenError,
  ValidationError,
} from '../../Errors'
import { SingleUseTokenType } from '../../Models/SingleUseTokenModels'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { ConnectSignupCredentials, SignupCredentials, User } from '../../Models/UserModels'
import { getExpirationTime } from '../../Utilities/JWT/LoginTokenPayload'
import { AuthService } from '../Auth/AuthService'
import { EmailService } from '../Email/EmailService'
import { ISyncService } from '../Sync/ISyncService'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { IUserRegistrationService } from './IUserRegistrationService'

/** Account verification token timeout. */
const VERIFICATION_TOKEN_TIMEOUT = () => getExpirationTime(24)

export class UserRegistrationService implements IUserRegistrationService {
  constructor(
    private userRepository: IUserRepository,
    private userEmailRepository: IUserEmailRepository,
    private emailService: EmailService,
    private singleUseTokenRepository: ISingleUseTokenRepository,
    private activityTrackingService: UserActivityTrackingService,
    private userStatusRepository: IUserStatusRepository,
    private syncService: ISyncService
  ) {}

  public async connectSignup(credentials: ConnectSignupCredentials): Promise<void> {
    const { email, name, connectUserID } = credentials

    const user = await this.userRepository.getOne({
      email,
    })

    if (user) {
      if (user.connectUserID != connectUserID) {
        await this.updateConnectID(user, connectUserID)
        return
      }
      throw new DuplicateEmailError(user.email)
    }

    try {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.create({ _id: userEmailID })
    } catch (error) {
      throw new DuplicateEmailError(email)
    }

    const newUser = await this.userRepository.create({ email, name, connectUserID })

    await this.createUserDetails(newUser, true)

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      newUser._id,
      UserActivityEventType.Registration,
      null,
      null
    ) // intentional fire and forget.
  }

  private async updateConnectID(user: User, connectUserID: string) {
    user.connectUserID = connectUserID
    await this.userRepository.update(user)
    this.activityTrackingService.createEvent(
      user._id,
      UserActivityEventType.UpdateConnectID,
      null,
      null
    )
  }

  public async signup(credentials: SignupCredentials): Promise<void> {
    const { token, email, name, password } = credentials
    if (token) {
      try {
        jwt.verify(token, config.auth.serverSecret)
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
      email,
    })

    if (user) {
      await this.handleUserExistence(user)
    }

    try {
      const userEmailID = this.userEmailID(email)
      await this.userEmailRepository.create({ _id: userEmailID })
    } catch (error) {
      throw new DuplicateEmailError(email)
    }

    const newUser = await this.userRepository.create({ email, name })

    await this.createUserDetails(newUser, skipVerification, password)

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

  private userEmailID(email: string) {
    return checksum(email, { algorithm: 'sha1' })
  }

  private async createUserDetails(user: User, skipVerification: boolean, password?: string) {
    await this.syncService.createUserProfile(user)

    await this.userStatusRepository.create({
      _id: user._id,
      blockUntil: null,
      isVerified: skipVerification,
      password: password ? await AuthService.createPassword(password) : '',
      createdAt: new Date(),
      deviceSessions: {},
    })
  }

  private async handleUserExistence(user: User) {
    const userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus) {
      // tslint:disable-next-line: no-floating-promises
      this.activityTrackingService.createEvent(
        user._id,
        UserActivityEventType.StatusNotFound,
        null,
        null
      )
      throw new MissingUserStatusError(user._id)
    }

    if (userStatus.isVerified) {
      throw new ConflictingRecordError('User already exists.', user)
    } else {
      throw new ConflictingUnverifiedUserExistsError(user)
    }
  }

  public async sendAccountVerification(user: User) {
    const tokenId = await this.singleUseTokenRepository.ensureTokenExists(
      user,
      SingleUseTokenType.VerifyEmailToken,
      VERIFICATION_TOKEN_TIMEOUT()
    )
    await this.emailService.sendAccountVerification(user, tokenId)
  }

  public async verify(tokenId: string): Promise<void> {
    const userVerificationToken = await this.singleUseTokenRepository.getById(tokenId)

    if (!userVerificationToken) {
      throw new NoTokenError(tokenId)
    }

    await this.singleUseTokenRepository.remove({
      userId: userVerificationToken.userId,
      tokenType: userVerificationToken.tokenType,
    })
    const user = await this.userRepository.getById(userVerificationToken.userId)
    if (!user) {
      throw new InvalidCredentialsError('User not found')
    }

    await this.userStatusRepository.patchStatusWithUserId(user._id, { isVerified: true })

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      userVerificationToken.userId,
      UserActivityEventType.EmailVerified,
      null,
      null
    ) // intentional fire and forget.
  }

  public async requestVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.getOne({ email: email.toLowerCase() })
    if (!user) {
      throw new MissingUserRecordError(email)
    }
    const userStatus = await this.userStatusRepository.statusForUserId(user._id)

    if (!userStatus) {
      throw new MissingUserStatusError(user._id)
    }

    if (userStatus.isVerified) {
      throw new ValidationError('User email address already verified', null)
    }

    await this.sendAccountVerification(user)
    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      user._id,
      UserActivityEventType.RequestEmailVerification,
      null,
      null
    ) // intentional fire and forget.
  }
}
