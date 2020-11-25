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

import { InvitationController } from '../../../../../../src/Controller/V1/Invitation/InvitationController'
import { ValidationError, InvalidCredentialsError } from '../../../../../../src/Errors'
import { authorizationHeader, ValidContentTypeAcceptJsonHeader } from '../../../../../data/fixtures/headers'
import { ContainerRole } from '../../../../../../src/Models/ContainerModels'
import { TEST_TIMEOUT } from '../../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

describe('InvitationController', () => {
  describe('invite', () => {
    test('should fail if the user not exist', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsersEmails: ['valid-google@manuscriptsapp.com'],
          message: 'message'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the header is not valid', async () => {
      const header = {
        authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk'
      }
      const req: any = {
        body: {
          invitedUsersEmails: ['valid-google@manuscriptsapp.com'],
          message: 'message'
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the token is not valid', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsImlhdCI6MTUyMTk4Mjk2Mn0.VlDI1RNozfrJ2Z9V1R5Luu46lkVAIzhwX2ySkihlDS8')
      const req: any = {
        body: {
          invitedUsersEmails: ['valid-google@manuscriptsapp.com'],
          message: 'message'
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrowError(InvalidCredentialsError)
    })

    test('should fail if the invited users not array', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsersEmails: 'valid-google@manuscriptsapp.com',
          message: 'message'
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the message is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsersEmails: ['valid-google@manuscriptsapp.com'],
          message: 123
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.invite(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('reject', () => {
    test('should fail if invitationId is not a string', async () => {
      const req: any = {
        body: {
          invitationId: 123
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.reject(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('accept', () => {
    test('should fail if invitationId is not a string', async () => {
      const req: any = {
        body: {
          invitationId: 123
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if password sent and is not a string', async () => {
      const req: any = {
        body: {
          invitationId: 'MPInvitation:foo',
          password: 123
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if name sent and is not a string', async () => {
      const req: any = {
        body: {
          invitationId: 'MPInvitation:foo',
          password: '123',
          name: 123
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.accept(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('inviteProject', () => {
    test('should fail if the user does not exist', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 'message',
          role: ContainerRole.Owner
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the header is not valid', async () => {
      const header = {
        authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk'
      }
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 'message',
          role: ContainerRole.Owner
        },
        user: {
          _id: 'id'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the token is not valid', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsImlhdCI6MTUyMTk4Mjk2Mn0.VlDI1RNozfrJ2Z9V1R5Luu46lkVAIzhwX2ySkihlDS8')
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 'message',
          role: ContainerRole.Owner
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the invited users not array', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsersEmails: { email: 'valid-google@manuscriptsapp.com' },
          message: 'message',
          role: ContainerRole.Owner
        },
        user: {
          _id: 'id'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the message is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 123,
          role: ContainerRole.Owner
        },
        user: {
          _id: 'id'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the projectId is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 'Message',
          projectId: 123,
          role: ContainerRole.Owner
        },
        user: {
          _id: 'id'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 123,
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the role is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitedUsers: [{
            email: 'valid-google@manuscriptsapp.com'
          }],
          message: 'Message',
          role: 123
        },
        user: {
          _id: 'id'
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        },
        params: {
          containerID: 'MPProject:Id',
          containerType: 'project'
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.inviteToContainer(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('uninvite', () => {
    test('should fail if the user not exist', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitationId: checksum('valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2', { algorithm: 'sha1' })
        },
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the header is not valid', async () => {
      const header = {
        authorization: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk'
      }
      const req: any = {
        body: {
          invitationId: checksum('valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2', { algorithm: 'sha1' })
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the token is not valid', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsImlhdCI6MTUyMTk4Mjk2Mn0.VlDI1RNozfrJ2Z9V1R5Luu46lkVAIzhwX2ySkihlDS8')
      const req: any = {
        body: {
          invitationId: checksum('valid-user@manuscriptsapp.com-valid-google@manuscriptsapp.com-valid-project-id-2', { algorithm: 'sha1' })
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrowError(InvalidCredentialsError)
    })

    test('should fail if the invitationId is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        body: {
          invitationId: 123
        },
        user: {},
        headers: {
          ...ValidContentTypeAcceptJsonHeader,
          ...header
        }
      }
      const invitationController = new InvitationController()

      return expect(invitationController.uninvite(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('accessSharedUri', () => {
    test('should fail if the token is not string', async () => {
      const req: any = {
        body: {
          token: 123
        },
        headers: {
          authorization: 'Bearer 142971'
        },
        params: {
          containerType: 'project'
        }
      }

      const invitationController = new InvitationController()

      return expect(invitationController.acceptInvitationToken(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if container type is invalid', async () => {
      const req: any = {
        body: {
          token: '123'
        },
        headers: {
          authorization: 'Bearer 142971'
        },
        params: {
          containerType: 'abc'
        }
      }

      const invitationController = new InvitationController()

      return expect(invitationController.acceptInvitationToken(req)).rejects.toThrowError(ValidationError)
    })
  })

  describe('requestInvitationToken', () => {
    test('should fail if the containerID is not string', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        headers: {
          ...header
        },
        params: {
          containerID: 123,
          role: ContainerRole.Viewer
        },
        user: {}
      }
      const invitationController = new InvitationController()

      return expect(invitationController.requestInvitationToken(req)).rejects.toThrowError(ValidationError)
    })

    test('should fail if the role is not valid', async () => {
      const header = authorizationHeader('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbklkIjoiVXNlcnx2YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbStkZXZpY2VJZCIsInVzZXJJZCI6IlVzZXJ8aW52YWxpZC11c2VyQG1hbnVzY3JpcHRzYXBwLmNvbSIsImFwcElkIjoiQXBwbGljYXRpb258OWE5MDkwZDktNmY5NS00MjBjLWI5MDMtNTQzZjMyYjUxNDBmIiwiaWF0IjoxNTIxOTgyOTYyfQ.WcZF9zjESaVY0wNCgq5fBmzE5N3bJDWC7Osm4h7lDVk')
      const req: any = {
        headers: {
          ...header
        },
        params: {
          containerID: 'MPProject:foo',
          role: 'not-valid'
        },
        user: {}
      }
      const invitationController = new InvitationController()

      return expect(invitationController.requestInvitationToken(req)).rejects.toThrowError(ValidationError)
    })
  })
})
