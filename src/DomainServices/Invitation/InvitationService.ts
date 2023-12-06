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

import { ObjectTypes } from '@manuscripts/json-schema'
import checksum from 'checksum'

import { IUserProfileRepository } from '../../DataAccess/Interfaces/IUserProfileRepository'
import { IUserRepository } from '../../DataAccess/Interfaces/IUserRepository'
import { InvitationRepository } from '../../DataAccess/InvitationRepository/InvitationRepository'
import { InvalidCredentialsError, ValidationError } from '../../Errors'
import { ContainerInvitationResponse } from '../../Models/ContainerModels'
import { UserActivityEventType } from '../../Models/UserEventModels'
import { isString } from '../../util'
import { getExpirationTime } from '../../Utilities/JWT/LoginTokenPayload'
import { EmailService } from '../Email/EmailService'
import { IUserRegistrationService } from '../Registration/IUserRegistrationService'
import { username as sgUsername } from '../Sync/SyncService'
import { UserService } from '../User/UserService'
import { UserActivityTrackingService } from '../UserActivity/UserActivityTrackingService'
import { IInvitationService } from './IInvitationService'

export class InvitationService implements IInvitationService {
  /**
   * Invitation expiry time after sending it.
   */
  public static invitationExpiryInDays = () => getExpirationTime(30 * 24)

  constructor(
    private userRepository: IUserRepository,
    private userProfileRepository: IUserProfileRepository,
    private emailService: EmailService,
    private invitationRepository: InvitationRepository,
    private activityTrackingService: UserActivityTrackingService,
    private userRegistrationService: IUserRegistrationService
  ) {}

  public async invite(
    invitingUserId: string,
    invitedUserEmails: string[],
    message: string
  ): Promise<void> {
    const invitingUser = await this.userRepository.getById(invitingUserId)

    if (!invitingUser) {
      throw new InvalidCredentialsError('User not found')
    }

    if (invitedUserEmails.length === 0) {
      throw new ValidationError('invitedUserEmails unexpectedly empty', invitedUserEmails)
    }

    if (invitedUserEmails.indexOf(invitingUser.email) >= 0) {
      throw new ValidationError('Inviting user can not invite himself.', invitingUser.email)
    }

    const userID = sgUsername(invitingUserId)
    const invitingUserProfile = await this.userProfileRepository.getById(
      UserService.profileID(invitingUser._id),
      userID
    )

    if (!invitingUserProfile) {
      throw new ValidationError(
        "Inviting user's profile could not be retrieved",
        UserService.profileID(invitingUser._id)
      )
    }

    for (const invitedUserEmail of invitedUserEmails) {
      const invitedUser = await this.userRepository.getOne({ email: invitedUserEmail })
      let invitedUserID
      if (invitedUser) {
        invitedUserID = invitedUser._id.replace('|', '_')
      }

      const invitedEmail = invitedUserEmail.toLowerCase()
      const invitationTupleHash = checksum(`${invitingUser.email}-${invitedEmail}`, {
        algorithm: 'sha1',
      })

      const invitationID = `${ObjectTypes.Invitation}:${invitationTupleHash}`

      let invitation = await this.invitationRepository.getById(invitationID)
      if (invitation) {
        await this.invitationRepository.touch(
          invitationID,
          InvitationService.invitationExpiryInDays(),
          userID
        )
      } else {
        invitation = await this.invitationRepository.create(
          {
            _id: invitationTupleHash,
            invitingUserID: userID,
            invitingUserProfile,
            invitedUserEmail: invitedEmail,
            invitedUserID,
            message,
            objectType: ObjectTypes.Invitation,
          },
          userID
        )
      }

      await this.emailService.sendInvitation({ email: invitedEmail }, invitingUser, invitationID)
    }

    // tslint:disable-next-line: no-floating-promises
    this.activityTrackingService.createEvent(
      invitingUser._id,
      UserActivityEventType.SendInvitation,
      null,
      null
    )
  }

  public async accept(
    invitationID: string,
    password: string | null,
    name: string | null
  ): Promise<ContainerInvitationResponse> {
    const invitation = await this.invitationRepository.getById(invitationID)

    if (!invitation) {
      throw new ValidationError('Invitation not found', invitationID)
    }

    const invitedEmail = invitation.invitedUserEmail.toLowerCase()

    let invitedUser = await this.userRepository.getOne({
      email: invitedEmail,
    })

    if (!invitedUser && (!isString(name) || !isString(password))) {
      throw new ValidationError('Name and password must be set', invitationID)
    }

    if (!invitedUser) {
      await this.userRegistrationService.signup({
        email: invitedEmail,
        name: name as string,
        password: password || undefined,
      })
    }

    invitedUser = await this.userRepository.getOne({
      email: invitedEmail,
    })

    if (!invitedUser) {
      throw new InvalidCredentialsError('Invited user not found')
    }

    await this.invitationRepository.remove(invitationID)
    return {
      containerID: null,
      message: 'Invitation accepted',
    }
  }

  public async reject(invitationID: string): Promise<void> {
    const invitation = await this.invitationRepository.getById(invitationID)

    if (!invitation) {
      throw new ValidationError(`Invitation with id ${invitationID} does not exist`, invitationID)
    }

    await this.invitationRepository.remove(invitationID)
  }

  public async updateInvitedUserID(userID: string, userEmail: string) {
    const invitations = await this.invitationRepository.getAllByEmail(userEmail)
    for (const invitation of invitations) {
      await this.invitationRepository.patch(invitation._id, { invitedUserID: userID })
    }
  }
}
