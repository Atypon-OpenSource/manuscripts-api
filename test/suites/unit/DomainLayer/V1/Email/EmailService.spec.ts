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

import '../../../../../../test/utilities/dbMock'

import { validUser1 } from '../../../../../data/fixtures/UserRepository'

jest.mock('email-templates', () =>
  jest.fn().mockImplementation(() => {
    return {
      render: jest.fn((_foo, opts: any) => {
        if (opts && opts.to && opts.to.email === 'fail@manuscripts.io') {
          return Promise.reject(new Error('fake email-templates.render set to fail.'))
        }
        return Promise.resolve()
      }),
    }
  })
)

import { DIContainer } from '../../../../../../src/DIContainer/DIContainer'
import {
  Container,
  ContainerRole,
  ContainerType,
} from '../../../../../../src/Models/ContainerModels'
import { validUserStatus } from '../../../../../../test/data/fixtures/authServiceUser'
import { validProject } from '../../../../../../test/data/fixtures/projects'
import { validUser } from '../../../../../../test/data/fixtures/userServiceUser'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(() => {
  ;(DIContainer as any)._sharedContainer = null
  return DIContainer.init()
})

describe.skip('EmailService - sendEmail', () => {
  test('should fail due to the AWS send email service', async () => {
    const emailService = DIContainer.sharedContainer.emailService
    const user = { ...validUser1 }
    user.email = 'fail@manuscripts.io'

    return expect(emailService.sendAccountVerification(user, 'derp')).rejects.toThrow()
  })

  test('should send email', async () => {
    const emailService = DIContainer.sharedContainer.emailService

    return expect(emailService.sendAccountVerification(validUser1, 'derp')).resolves.toBeUndefined()
  })

  test('should render email templates', async () => {
    const emailService = DIContainer.sharedContainer.emailService
    emailService.sendMessage = jest.fn(() => Promise.resolve())

    await emailService.sendPasswordResetInstructions(validUser, validUserStatus as any, 'derp')

    await emailService.sendAccountVerification(validUser, 'derp')
    await emailService.sendAccountDeletionConfirmation(validUser)
    await emailService.sendAccountDeletionNotification(validUser)
    await emailService.sendInvitation(validUser, validUser, 'derp')
    await emailService.sendContainerInvitation(
      validUser,
      validUser,
      'derp',
      validProject as Container,
      ContainerRole.Viewer
    )

    await emailService.sendContainerInvitationAcceptance(
      validUser,
      validUser,
      validProject as Container,
      ContainerRole.Writer,
      ContainerType.project
    )

    await emailService.sendOwnerNotificationOfCollaborator(
      validUser,
      validUser,
      null,
      validProject as Container,
      ContainerRole.Owner,
      ContainerType.project
    )

    expect(emailService.sendMessage).toHaveBeenCalledTimes(8)
  })

  test('should not linewrap converted html', async () => {
    const emailService = DIContainer.sharedContainer.emailService

    return expect(
      emailService.htmlToText(
        `This is a <b>long</b> long long long long long long long long long long long long long long long long long long long string`
      )
    ).toMatch(/This is a (long ){20}string/)
  })
})
