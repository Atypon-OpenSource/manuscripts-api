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

import { Container } from '../Models/ContainerModels'
import { equal, validate } from './jsonSchemaValidator'
import prisma from './prismaClient'

enum AccessType {
  Read = 'read',
  Write = 'write',
  Reject = 'reject',
  Resolve = 'resolve',
  Contribute = 'contribute',
}

async function getContainer(id: string): Promise<Container | undefined> {
  const q = {
    where: {
      id,
    },
  } as any

  const container: any = await prisma.project.findUnique(q)
  if (container) {
    return container.data
  }
}

function requireUser(users: string[], userId: string | undefined): void {
  const found = users.find((i) => i === userId)
  if (!found) {
    throw { forbidden: 'user does not have access' }
  }
}

async function proceedWithAccess(doc: any, userId: string | undefined, accessType: AccessType) {
  if (!userId) {
    throw { forbidden: 'user does not have access' }
  }

  const container = typeof doc === 'string' ? await getContainer(doc) : doc

  if (!container) {
    throw { forbidden: 'container does not exist' }
  }

  const owners = container.owners
  const writers = container.writers
  const viewers = container.viewers || []
  const annotators = container.annotators || []
  const editors = container.editors || []

  switch (accessType) {
    case AccessType.Read: {
      const readUserIds = [].concat(owners, writers, viewers, annotators, editors)
      requireUser(readUserIds, userId)
      break
    }
    case AccessType.Write: {
      const writeUserIds = [].concat(owners, writers)
      requireUser(writeUserIds, userId)
      break
    }
    case AccessType.Reject: {
      const rejectUserIds = [].concat(owners, writers, editors)
      requireUser(rejectUserIds, userId)
      break
    }
    case AccessType.Resolve: {
      const resolveUserIds = [].concat(owners, writers, editors)
      requireUser(resolveUserIds, userId)
      break
    }
    case AccessType.Contribute: {
      const contributeUserIds = [].concat(owners, writers, editors, annotators)
      requireUser(contributeUserIds, userId)
      break
    }
    default:
      throw { forbidden: 'user does not have access' }
  }
}

export async function proceedWithReadAccess(doc: any, userId: string | undefined) {
  return proceedWithAccess(doc, userId, AccessType.Read)
}

export async function proceedWithWriteAccess(doc: any, userId: string | undefined) {
  return proceedWithAccess(doc, userId, AccessType.Write)
}

export async function proceedWithRejectAccess(doc: any, userId: string | undefined) {
  return proceedWithAccess(doc, userId, AccessType.Reject)
}

export async function proceedWithResolveAccess(doc: any, userId: string | undefined) {
  return proceedWithAccess(doc, userId, AccessType.Resolve)
}

export async function proceedWithContributeAccess(doc: any, userId: string | undefined) {
  return proceedWithAccess(doc, userId, AccessType.Contribute)
}

export async function syncAccessControl(doc: any, oldDoc: any, userId?: string): Promise<void> {
  let errorMessage

  if (oldDoc && oldDoc._deleted && doc._deleted) {
    throw { forbidden: 'deleted document cannot be mutated' }
  }

  if (!doc._id) {
    throw { forbidden: 'missing _id' }
  }

  if (doc.objectType && doc._id.substr(0, doc._id.indexOf(':')) !== doc.objectType) {
    throw { forbidden: '_id must have objectType as prefix' }
  }

  const isAllowedToUndelete = !!doc.containerID

  if (oldDoc && oldDoc._deleted && !isAllowedToUndelete) {
    errorMessage = validate(doc)

    if (errorMessage) {
      // prettier-ignore
      throw({ forbidden: errorMessage });
    }
  } else if (!doc._deleted || isAllowedToUndelete) {
    // check that the update isn't mutating objectType
    if (oldDoc && oldDoc.objectType !== doc.objectType) {
      // prettier-ignore
      throw({ forbidden: 'objectType cannot be mutated' });
    }

    if (oldDoc && oldDoc.containerID !== doc.containerID) {
      // prettier-ignore
      throw({ forbidden: 'containerID cannot be mutated' });
    }

    errorMessage = validate(doc)

    if (errorMessage) {
      // prettier-ignore
      throw({ forbidden: errorMessage });
    }
  }

  function objectTypeMatches(arg: string) {
    return doc.objectType === arg || (oldDoc && oldDoc.objectType === arg)
  }

  // Arrays are order aware
  /**
   * @param key string
   * @returns {boolean}
   */
  function hasMutated(key: string | undefined) {
    // when oldDoc === null, we're dealing with the first revision, which is never a mutation.
    if (oldDoc === null) {
      return false
    }

    // records that cannot be deleted don't need to be checked for mutations at deletion time.
    /*if (doc._deleted && !isAllowedToUndelete) {
      return false
    }*/

    if (key) {
      const objA = doc[key]
      const objB = oldDoc[key]
      return !equal(objA, objB)
    }

    return !equal(doc, oldDoc)
  }

  if (
    objectTypeMatches('MPProject') ||
    objectTypeMatches('MPLibraryCollection') ||
    objectTypeMatches('MPLibrary')
  ) {
    if (doc.owners.length === 0) {
      // prettier-ignore
      throw({ forbidden: 'owners cannot be set/updated to be empty' });
    }

    const owners = doc.owners
    const writers = doc.writers
    const viewers = doc.viewers || []
    const annotators = doc.annotators || []
    const editors = doc.editors || []

    const allUserIds = [].concat(owners, writers, viewers, annotators, editors)

    if (!doc._deleted) {
      // if there have been changes, we need to be ensure we are the owner
      if (
        hasMutated('owners') ||
        hasMutated('writers') ||
        hasMutated('viewers') ||
        hasMutated('annotators') ||
        hasMutated('editors')
      ) {
        requireUser(owners, userId)
      }

      if (
        (objectTypeMatches('MPLibraryCollection') || objectTypeMatches('MPLibrary')) &&
        hasMutated('category')
      ) {
        throw { forbidden: 'category cannot be mutated' }
      }

      // only do this for non-deleted items for perf.
      const userIds: any = {}
      for (let i = 0; i < allUserIds.length; i++) {
        if (allUserIds[i] in userIds) {
          // prettier-ignore
          throw({ forbidden: 'duplicate userId:' + allUserIds[i] });
        }
        userIds[allUserIds[i]] = true
      }
    }

    if (oldDoc) {
      await proceedWithWriteAccess(oldDoc, userId)
    } else {
      if (objectTypeMatches('MPLibraryCollection')) {
        requireUser([].concat(owners, writers), userId)
      } else {
        requireUser(owners, userId)
      }
    }
  } else if (
    objectTypeMatches('MPCollaboration') ||
    objectTypeMatches('MPInvitation') ||
    objectTypeMatches('MPContainerInvitation')
  ) {
    const isCollaboration = objectTypeMatches('MPCollaboration')
    const invitingUserID = doc.invitingUserID || (oldDoc && oldDoc.invitingUserID)

    if (isCollaboration) {
      if (hasMutated(undefined)) {
        // prettier-ignore
        throw({ forbidden: 'MPCollaboration is immutable' });
      }
      requireUser([invitingUserID], userId)
    }
  } else if (objectTypeMatches('MPPreferences')) {
    const username = doc._id.replace(/^MPPreferences:/, '')
    requireUser([username], userId)
  } else if (objectTypeMatches('MPMutedCitationAlert')) {
    const userID = doc.userID
    requireUser([userID], userId)
  } else if (objectTypeMatches('MPCitationAlert')) {
    if (hasMutated('isRead')) {
      const userID = doc.userID
      requireUser([userID], userId)
    }
  } else if (objectTypeMatches('MPBibliographyItem')) {
    if (doc.keywordIDs) {
      for (let i = 0; i < doc.keywordIDs.length; i++) {
        const keywordID = doc.keywordIDs[i]
        await proceedWithRejectAccess(keywordID, userId)
      }
    }
  } else if (
    objectTypeMatches('MPCorrection') ||
    objectTypeMatches('MPCommentAnnotation') ||
    objectTypeMatches('MPManuscriptNote')
  ) {
    if (doc.contributions) {
      if (doc.contributions.length !== 1) {
        throw {
          forbidden: 'Only one contribution allowed',
        }
      }

      if (hasMutated('contributions')) {
        throw { forbidden: 'contributions cannot be mutated' }
      }

      const isApprovingCorrections = !!(
        objectTypeMatches('MPCorrection') &&
        oldDoc &&
        hasMutated('status')
      )
      const isResolvingComments = !!(
        (objectTypeMatches('MPCommentAnnotation') || objectTypeMatches('MPManuscriptNote')) &&
        oldDoc &&
        hasMutated('resolved')
      )
      const isRejecting =
        (isApprovingCorrections && doc.status && doc.status.label === 'rejected') ||
        (isResolvingComments && doc.resolved === false)

      if (isRejecting) {
        await proceedWithRejectAccess(doc.containerID, userId)
      } else if (isApprovingCorrections || isResolvingComments) {
        await proceedWithResolveAccess(doc.containerID, userId)
      } else {
        await proceedWithContributeAccess(doc.containerID, userId)
      }
    }
    if (hasMutated('readBy')) {
      if (doc.readBy.includes(doc.contributions[0].profileID)) {
        await proceedWithWriteAccess(doc.containerID, userId)
      } else {
        throw {
          forbidden: 'User can set status "read" only for himself and cannot unset it',
        }
      }
    }
  } else if (objectTypeMatches('MPCommit')) {
    if (!hasMutated(undefined)) {
      await proceedWithContributeAccess(doc.containerID, userId)
    } else {
      await proceedWithWriteAccess(doc.containerID, userId)
    }
  }

  const containerId = doc.containerID

  if (
    containerId &&
    !objectTypeMatches('MPContainerInvitation') &&
    !objectTypeMatches('MPContainerRequest') &&
    !objectTypeMatches('MPCorrection') &&
    !objectTypeMatches('MPCommentAnnotation') &&
    !objectTypeMatches('MPManuscriptNote') &&
    !objectTypeMatches('MPCommit')
  ) {
    await proceedWithWriteAccess(doc.containerID, userId)
  }
}
