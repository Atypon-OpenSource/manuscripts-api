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
// @ts-nocheck
/* istanbul ignore file */
import EmailTemplate from 'email-templates'
import * as htmlToText from 'html-to-text'
import { stringify } from 'querystring'
import { URL } from 'url'

import { config } from '../../Config/Config'
import { EmailConfiguration } from '../../Config/ConfigurationTypes'
import {
  Container,
  ContainerRole,
  ContainerType,
  InvitedUserData,
} from '../../Models/ContainerModels'
import { User, UserStatus } from '../../Models/UserModels'
import { ContainerService } from '../Container/ContainerService'
import { MessageType, templateNameForMessageType } from './MessageTypes'

interface MessageOptions {
  actionURL: string | null

  invitingUser?: User
  userStatus?: UserStatus
  token?: string

  to?: User
  invitedUser?: User | null
  invitationID?: string

  container?: Container
  containerTitle?: string
  role?: ContainerRole

  frontendAppBaseURL?: string
  frontendAppHostname?: string

  requestingUser?: User
  acceptingUser?: User
}

export class EmailService {
  private emailer: EmailTemplate
  constructor(readonly emailConfiguration: EmailConfiguration, readonly AWSConfiguration: any) {
    /*const transport = nodemailer.createTransport({
      SES: { apiVersion: '2010-12-01', ...SES },
    })*/
    const transport = {} // add sendgrid transport

    this.emailer = new EmailTemplate({
      message: {
        from: emailConfiguration.fromAddress,
      },
      transport,
      htmlToText: true,
    })
  }

  /**
   * Send an email to a specified address.
   */
  async sendMessage(
    emailType: MessageType,
    to: User | InvitedUserData,
    opts: MessageOptions
  ): Promise<void> {
    if (opts.container) {
      opts.containerTitle = `${this.htmlToText(
        ContainerService.containerTitle(opts.container) || 'Untitled Project'
      )}` // double quoted.
    }
    opts.frontendAppBaseURL = this.emailConfiguration.fromBaseURL
    opts.frontendAppHostname = new URL(config.email.fromBaseURL).hostname
    const template = templateNameForMessageType(emailType)

    /* // FIXME: Replace the aws-sdk based sending method with the email-templates send.
    const response = await this.emailer.send({
      message: {
        to: [ to.email ]
      },
      template,
      locals: {
        ...opts
      }
    })
    if (!response) {
      throw new EmailServiceError(template, null)
    }*/
    const messageHTML = await this.emailer.render(template + '/html', {
      to,
      ...opts,
    })

    const subjectHTML = await this.emailer.render(template + '/subject', {
      to,
      ...opts,
    })

    /*return new Promise<void>((resolve, reject) => {
      const req = SES.sendEmail(
        {
          Source: this.emailConfiguration.fromAddress,
          Destination: { ToAddresses: [to.email] },
          Message: {
            Subject: {
              Data: this.htmlToText(subjectHTML),
              Charset: 'UTF-8',
            },
            Body: {
              Text: {
                Data: htmlToText.fromString(messageHTML),
                Charset: 'UTF-8',
              },
              Html: {
                Data: messageHTML,
                Charset: 'UTF-8',
              },
            },
          },
          ReplyToAddresses: [this.emailConfiguration.fromAddress],
          ReturnPath: this.emailConfiguration.fromAddress,
          // SourceArn: '…',
          // ReturnPathArn: '…',
          Tags: [{ Name: 'template', Value: template }],
        },
        (err: AWSError, _data: SendEmailResponse) => {
          if (err) {
            return reject(new EmailServiceError('Sending email failed', err))
          }
          return resolve()
        }
      )
      if (!req) {
        reject(new EmailServiceError('Failed to create email sending request', null))
      }
    })*/
    return
  }

  htmlToText = (input: string) =>
    htmlToText.fromString(input, {
      wordwrap: false,
    })

  sendPasswordResetInstructions = (to: User, userStatus: UserStatus, tokenID: string) =>
    this.sendMessage(MessageType.PasswordReset, to, {
      userStatus,
      token: tokenID,
      actionURL: `${this.emailConfiguration.fromBaseURL}/recover#${stringify({
        token: tokenID,
      })}`,
    })

  sendAccountVerification = (to: User, tokenID: string) =>
    this.sendMessage(MessageType.AccountVerify, to, {
      token: tokenID,
      actionURL: `${this.emailConfiguration.fromBaseURL}/signup#${stringify({
        token: tokenID,
      })}`,
    })

  sendAccountDeletionConfirmation = (to: User) =>
    this.sendMessage(MessageType.AccountDeleted, to, { actionURL: null })

  sendAccountDeletionNotification = (to: User) =>
    this.sendMessage(MessageType.AccountMarkedForDeletion, to, {
      actionURL: `${this.emailConfiguration.fromBaseURL}/retrieve-account`,
    })

  sendInvitation = (to: User | InvitedUserData, invitingUser: User, tokenID: string) =>
    this.sendMessage(MessageType.Invitation, to, {
      invitingUser,
      token: tokenID,
      actionURL: `${this.emailConfiguration.fromBaseURL}/invitation#${stringify({
        token: tokenID,
      })}`,
    })

  // TODO: create separate email templates for different container types.
  sendContainerInvitation = (
    to: User | InvitedUserData,
    invitingUser: User,
    invitationID: string,
    container: Container,
    role: ContainerRole
  ) =>
    this.sendMessage(MessageType.ProjectInvitation, to, {
      invitingUser,
      invitationID,
      container,
      role,
      actionURL: `${this.emailConfiguration.fromBaseURL}/invitation#${stringify(
        { token: invitationID } // FIXME: Must be changed to invitationID instead of token when corresponding changes are made in manuscripts-frontend.
      )}`,
    })

  sendContainerInvitationAcceptance = (
    to: User,
    invitingUser: User | null,
    container: Container,
    role: ContainerRole,
    containerType: ContainerType
  ) =>
    this.sendMessage(MessageType.ProjectInvitationAcceptance, to, {
      invitingUser: invitingUser || undefined,
      container,
      role,
      actionURL: `${this.emailConfiguration.fromBaseURL}/${this.containerTypeForURL(
        containerType
      )}/${container._id}`,
    })

  sendOwnerNotificationOfCollaborator = (
    to: User,
    addedUser: User,
    invitingUser: User | null,
    container: Container,
    role: ContainerRole,
    containerType: ContainerType
  ) =>
    this.sendMessage(MessageType.ProjectInvitationOwnerNotification, to, {
      invitedUser: addedUser,
      invitingUser: invitingUser || undefined,
      container,
      role,
      actionURL: `${this.emailConfiguration.fromBaseURL}/${this.containerTypeForURL(
        containerType
      )}/${container._id}`,
    })

  sendContainerRequest = (
    to: User,
    requestingUser: User,
    container: Container,
    role: ContainerRole
  ) =>
    this.sendMessage(MessageType.ContainerRequest, to, {
      requestingUser,
      container,
      role,
      actionURL: `${this.emailConfiguration.fromBaseURL}/${this.containerTypeForURL(
        ContainerType.project
      )}/${container._id}`,
    })

  requestResponse = (
    to: User,
    acceptingUser: User,
    container: Container,
    role: ContainerRole,
    accept: boolean
  ) =>
    this.sendMessage(
      accept ? MessageType.ContainerRequestAcceptance : MessageType.ContainerRequestRejection,
      to,
      {
        acceptingUser,
        container,
        role,
        actionURL: `${this.emailConfiguration.fromBaseURL}/${this.containerTypeForURL(
          ContainerType.project
        )}/${container._id}`,
      }
    )

  private containerTypeForURL(containerType: ContainerType) {
    switch (containerType) {
      case ContainerType.project:
        return 'projects'
    }
  }
}
