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

export async function onUpdate(doc: any, meta: any) {
  if (meta.id.startsWith('MPUserProfile:')) {
    await onUpdateUserProfile()
  } else if (
    meta.id.startsWith('MPProject:') ||
    meta.id.startsWith('MPLibrary:') ||
    meta.id.startsWith('MPLibraryCollection:')
  ) {
    await onUpdateContainer()
  }

  async function removeDeletedContainerFromUserCollaborator(userCollaborators: any[]) {
    for (const userCollaborator of userCollaborators) {
      for (const role of Object.keys(userCollaborator.containers)) {
        const index = userCollaborator.containers[role].indexOf(meta.id)
        if (index >= 0) {
          userCollaborator.containers[role].splice(index, 1)
          break
        }
      }
      if (
        !userCollaborator.containers.owner.length &&
        !userCollaborator.containers.writer.length &&
        !userCollaborator.containers.viewer.length
      ) {
        await DIContainer.sharedContainer.userCollaboratorRepository.remove(userCollaborator._id)
      } else {
        await DIContainer.sharedContainer.userCollaboratorRepository.patch(userCollaborator._id, {
          containers: userCollaborator.containers,
        } as any)
      }
    }
  }

  async function removeContainerFromUserCollaborator(
    containerUsersIDs: string[],
    userCollaborators: any[],
    role: string
  ) {
    const usersIDs = doc.owners.concat(doc.writers, doc.viewers)

    for (const userCollaborator of userCollaborators) {
      const isUserIDMissing = !usersIDs.includes(userCollaborator.userID)
      const isUserProfileMissing = !containerUsersIDs.includes(
        userCollaborator.collaboratorProfile.userID
      )

      if (isUserProfileMissing || isUserIDMissing) {
        const index = userCollaborator.containers[role].indexOf(meta.id)
        userCollaborator.containers[role].splice(index, 1)

        if (
          !userCollaborator.containers.owner.length &&
          !userCollaborator.containers.writer.length &&
          !userCollaborator.containers.viewer.length
        ) {
          await DIContainer.sharedContainer.userCollaboratorRepository.remove(userCollaborator._id)
        } else {
          await DIContainer.sharedContainer.userCollaboratorRepository.patch(userCollaborator._id, {
            containers: userCollaborator.containers,
          } as any)
        }
      }
    }
  }

  async function createUserCollaborator(userID: string, collaborators: string[], role: string) {
    const containerID = meta.id

    for (const collaborator of collaborators) {
      if (userID !== collaborator) {
        const collaboratorProfile =
          await DIContainer.sharedContainer.userProfileRepository.getByUserId(collaborator)

        if (collaboratorProfile) {
          const userCollaborators =
            await DIContainer.sharedContainer.userCollaboratorRepository.getByUserIdOrProfileId(
              userID,
              collaboratorProfile._id
            )
          let userCollaborator = null

          for (const uc of userCollaborators) {
            userCollaborator = uc

            if (
              userCollaborator.containers &&
              !userCollaborator.containers[role].includes(containerID)
            ) {
              userCollaborator.containers[role].push(containerID)
              await DIContainer.sharedContainer.userCollaboratorRepository.patch(uc._id, {
                containers: userCollaborator.containers,
              } as any)
            }
          }

          if (!userCollaborator) {
            const containerRoles: any = {
              owner: [],
              writer: [],
              viewer: [],
            }

            containerRoles[role] = [containerID]

            try {
              const collaboratorObj = {
                _id: uuid_v4(),
                userID: userID,
                collaboratorID: collaboratorProfile._id,
                containers: containerRoles,
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
      await DIContainer.sharedContainer.userCollaboratorRepository.getByProfileId(meta.id)
    for (const uc of userCollaborators) {
      const otherUserCollaborators =
        await DIContainer.sharedContainer.userCollaboratorRepository.getByUserIdOrProfileId(
          uc.userID,
          meta.id
        )
      for (const uc of otherUserCollaborators) {
        await DIContainer.sharedContainer.userCollaboratorRepository.remove(uc._id)
      }
      //await DIContainer.sharedContainer.userCollaboratorRepository.remove(uc._id)
    }
  }

  async function updateUserCollaborator() {
    const userCollaborators =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByProfileId(meta.id)
    const docWithID = Object.assign({}, doc, { _id: meta.id })

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
    const containerID = meta.id

    const userCollaborators =
      await DIContainer.sharedContainer.userCollaboratorRepository.getByAnyContainerRole(
        containerID
      )
    await removeDeletedContainerFromUserCollaborator(userCollaborators)
  }

  async function updateContainer() {
    const containerID = meta.id
    const owners = doc.owners
    const writers = doc.writers
    const viewers = doc.viewers.filter((x: any) => x !== '*')
    const usersIDs = owners.concat(writers, viewers)

    for (const userID of usersIDs) {
      await createUserCollaborator(userID, owners, 'owner')
      await createUserCollaborator(userID, writers, 'writer')
      await createUserCollaborator(userID, viewers, 'viewer')
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
  }
}
