/*!
 * © 2022 Atypon Systems LLC
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

import { v4 as uuid_v4 } from 'uuid'
import { DIContainer } from '../DIContainer/DIContainer'
import { UserCollaborator } from '@manuscripts/manuscripts-json-schema'

export async function onUpdate(doc: any, id: string) {
  if (id.startsWith('MPUserProfile:')) {
    await onUpdateUserProfile()
  } else if (
    id.startsWith('MPProject:') ||
    id.startsWith('MPLibrary:') ||
    id.startsWith('MPLibraryCollection:')
  ) {
    await onUpdateContainer()
  } else {
    return
  }

  async function removeDeletedContainerFromUserCollaborator(userCollaborators: any[]) {
    for (const userCollaborator of userCollaborators) {
      for (const role of Object.keys(userCollaborator.projects)) {
        const index = userCollaborator.projects[role].indexOf(id)
        if (index >= 0) {
          userCollaborator.projects[role].splice(index, 1)
          break
        }
      }
      if (
        !userCollaborator.projects.owner.length &&
        !userCollaborator.projects.writer.length &&
        !userCollaborator.projects.viewer.length &&
        !userCollaborator.projects.annotator.length
      ) {
        await DIContainer.sharedContainer.userCollaboratorRepository.remove(userCollaborator._id)
      } else {
        await DIContainer.sharedContainer.userCollaboratorRepository.patch(userCollaborator._id, {
          projects: userCollaborator.projects,
        } as any)
      }
    }
  }

  async function removeContainerFromUserCollaborator(
    containerUsersIDs: string[],
    userCollaborators: any[],
    role: string
  ) {
    const usersIDs = doc.owners.concat(doc.writers, doc.viewers, doc.annotator)

    for (const userCollaborator of userCollaborators) {
      const isUserIDMissing = !usersIDs.includes(userCollaborator.userID)
      const isUserProfileMissing = !containerUsersIDs.includes(
        userCollaborator.collaboratorProfile.userID
      )

      if (isUserProfileMissing || isUserIDMissing) {
        const index = userCollaborator.projects[role].indexOf(id)
        userCollaborator.projects[role].splice(index, 1)

        if (
          !userCollaborator.projects.owner.length &&
          !userCollaborator.projects.writer.length &&
          !userCollaborator.projects.viewer.length &&
          !userCollaborator.projects.annotator.length
        ) {
          await DIContainer.sharedContainer.userCollaboratorRepository.remove(userCollaborator._id)
        } else {
          await DIContainer.sharedContainer.userCollaboratorRepository.patch(userCollaborator._id, {
            projects: userCollaborator.projects,
          } as any)
        }
      }
    }
  }

  async function createUserCollaborator(userID: string, collaborators: string[], role: string) {
    const containerID = id

    for (const collaborator of collaborators) {
      if (userID !== collaborator) {
        const collaboratorProfile =
          await DIContainer.sharedContainer.userProfileRepository.getByUserId(collaborator)

        if (collaboratorProfile) {
          const userCollaborators =
            await DIContainer.sharedContainer.userCollaboratorRepository.getByProfileId(
              collaboratorProfile._id
            )
          let userCollaborator = null

          for (const uc of userCollaborators) {
            userCollaborator = uc

            if (
              userCollaborator.projects &&
              !userCollaborator.projects[role].includes(containerID)
            ) {
              userCollaborator.projects[role].push(containerID)
              await DIContainer.sharedContainer.userCollaboratorRepository.patch(uc._id, {
                projects: userCollaborator.projects,
              } as any)
            }
          }

          if (!userCollaborator) {
            const containerRoles: any = {
              owner: [],
              writer: [],
              viewer: [],
              annotator: [],
            }

            containerRoles[role] = [containerID]

            try {
              const collaboratorObj = {
                _id: uuid_v4(),
                userID: userID,
                collaboratorID: collaboratorProfile._id,
                projects: containerRoles,
                collaboratorProfile,
              } as UserCollaborator
              await DIContainer.sharedContainer.userCollaboratorRepository.create(
                collaboratorObj as UserCollaborator
              )
            } catch (e) {
              console.log('User collaborator creation failed:' + JSON.stringify(e))
            }
          }
        }
      }
    }
  }

  async function onUpdateUserProfile() {
    const isDeleted = !doc
    if (isDeleted) {
      await deleteUserCollaborator()
    } else {
      await updateUserCollaborator()
    }
  }

  async function deleteUserCollaborator() {
    const userCollaborators =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByProfileId(id)
    for (const uc of userCollaborators) {
      const otherUserCollaborators =
        await DIContainer.sharedContainer.userCollaboratorRepository.getByUserId(uc.userID)
      for (const uc of otherUserCollaborators) {
        await DIContainer.sharedContainer.userCollaboratorRepository.remove(uc._id)
      }
      await DIContainer.sharedContainer.userCollaboratorRepository.remove(uc._id)
    }
  }

  async function updateUserCollaborator() {
    const userCollaborators =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByProfileId(id)
    const docWithID = Object.assign({}, doc, { _id: id })

    for (const userCollaborator of userCollaborators) {
      await DIContainer.sharedContainer.userCollaboratorRepository.patch(userCollaborator._id, {
        collaboratorProfile: docWithID,
      } as any)
    }
  }

  async function onUpdateContainer() {
    const isDeleted = !doc //doc['_deleted']
    if (isDeleted) {
      await deleteContainer()
    } else {
      await updateContainer()
    }
  }

  async function deleteContainer() {
    const containerID = id

    const userCollaborators =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByContainerId(containerID)
    await removeDeletedContainerFromUserCollaborator(userCollaborators)
  }

  async function updateContainer() {
    const containerID = id
    const owners = doc.owners
    const writers = doc.writers
    const viewers = doc.viewers.filter((x: any) => x !== '*')
    const annotators = doc.annotators
    const usersIDs = owners.concat(writers, viewers, annotators)

    for (const userID of usersIDs) {
      await createUserCollaborator(userID, owners, 'owner')
      await createUserCollaborator(userID, writers, 'writer')
      await createUserCollaborator(userID, viewers, 'viewer')
      if (annotators) {
        await createUserCollaborator(userID, annotators, 'annotator')
      }
    }

    const ownersIDs =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByContainerRole(
        containerID,
        'owner'
      )
    await removeContainerFromUserCollaborator(doc.owners, ownersIDs, 'owner')

    const writersIDs =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByContainerRole(
        containerID,
        'writer'
      )
    await removeContainerFromUserCollaborator(doc.writers, writersIDs, 'writer')

    const viewersIDs =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByContainerRole(
        containerID,
        'viewer'
      )
    await removeContainerFromUserCollaborator(doc.viewers, viewersIDs, 'viewer')

    const annotatorsIDs =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByContainerRole(
        containerID,
        'annotator'
      )
    await removeContainerFromUserCollaborator(doc.annotators, annotatorsIDs, 'annotator')
  }
}
