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

import { AccessControlRepository } from './AccessControlRepository'
const { equal, validate } = require('./jsonSchemaValidator')

function access(users: string[], channels: string[]): any {
  return () => AccessControlRepository.access(users, channels)
}

function channel(channels: string[], docId: string): any {
  return () => AccessControlRepository.channel(channels, docId)
}

async function requireAccess(channels: string[], userId: string | undefined): Promise<any> {
  if (!userId) {
    throw { forbidden: 'user does not have access' }
  }
  // succeed if user has access to at least one channel
  for (const channel of channels) {
    const access = await AccessControlRepository.getAccess(userId, channel)
    if (access.length) {
      return
    }
  }
  throw { forbidden: 'user does not have access' }
}

function requireUser(users: string[], userId: string | undefined): void {
  let found = users.find((i) => i === userId)
  if (!found) {
    throw { forbidden: 'require user' }
  }
}

export async function syncAccessControl(doc: any, oldDoc: any, userId?: string): Promise<void> {
  let errorMessage

  // deferreds will be called in the end, otherwise all will fail
  let channelDeferreds = []
  let accessDeferreds = []

  if (oldDoc && oldDoc._deleted && doc._deleted) {
    throw { forbidden: 'deleted document cannot be mutated' }
  }

  if (!doc._id) {
    throw { forbidden: 'missing _id' }
  }

  if (doc.objectType && doc._id.substr(0, doc._id.indexOf(':')) !== doc.objectType) {
    throw { forbidden: '_id must have objectType as prefix' }
  }

  let isAllowedToUndelete = !!doc.containerID

  if (oldDoc && oldDoc._deleted && !isAllowedToUndelete) {
    // Only allow admin port to undelete documents for which isAllowedToUndelete is falsy.
    //await requireAdmin();

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

  /*if (doc.locked || (oldDoc && oldDoc.locked)) {
    // Only allow admin port to create, modify or delete locked objects
    //await requireAdmin();
  }*/

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
      let objA = doc[key]
      let objB = oldDoc[key]
      return !equal(objA, objB)
    }

    return !equal(doc, oldDoc)
  }

  let docId = doc._id

  if (objectTypeMatches('MPProject')) {
    let owners, writers, viewers, annotators, editors

    /*if (doc._deleted) {
      owners = oldDoc.owners
      writers = oldDoc.writers
      viewers = (oldDoc.viewers || []).filter(function (v: string) {
        return v !== '*'
      })
      annotators = oldDoc.annotators || []
      editors = oldDoc.editors || []
    } else {*/
    if (doc.owners.length === 0) {
      // prettier-ignore
      throw({ forbidden: 'owners cannot be set/updated to be empty' });
    }
    owners = doc.owners
    writers = doc.writers
    viewers = doc.viewers || []
    annotators = doc.annotators || []
    editors = doc.editors || []
    //}

    let allUserIds = [].concat(owners, writers, viewers, annotators, editors)

    if (!doc._deleted) {
      // if there have been changes, we need to be ensure we are the admin
      if (
        hasMutated('owners') ||
        hasMutated('writers') ||
        hasMutated('viewers') ||
        hasMutated('annotators') ||
        hasMutated('editors')
      ) {
        //await requireAdmin();
        requireUser(owners, userId)
      }

      // only do this for non-deleted items for perf.
      let userIds: any = {}
      for (let i = 0; i < allUserIds.length; i++) {
        if (allUserIds[i] in userIds) {
          // prettier-ignore
          throw({ forbidden: 'duplicate userId:' + allUserIds[i] });
        }
        userIds[allUserIds[i]] = true
      }

      // if the doc was _deleted, and this was the only doc granting access to
      // the channels then we don't want to grant access anymore.
      // e.g. User_A should no longer have access to User_B-profile channel.
      for (let j = 0; j < allUserIds.length; j++) {
        let ids = []
        for (let k = 0; k < allUserIds.length; k++) {
          if (j === k) {
            continue
          }
          // push() seems to be the best option for 'otto'.
          // https://github.com/robertkrimen/otto/blob/master/builtin_array.go
          ids.push(allUserIds[k] + '-read')
        }

        accessDeferreds.push(access([allUserIds[j]], ids))

        let containersChannelID = allUserIds[j] + '-projects'

        if (containersChannelID) {
          channelDeferreds.push(channel([containersChannelID], docId))
          accessDeferreds.push(access([allUserIds[j]], [containersChannelID]))
        }
      }
    }

    let rChannelName = docId + '-read'
    let rwChannelName = docId + '-readwrite'
    /* The -bibitems channel is used to allow syncing only bibliography data associated with a container */
    let bibReadChannelName = docId + '-bibitems'
    let ownerChannelName = docId + '-owner'
    let annotatorChannelName = docId + '-annotator'
    let editorChannelName = docId + '-editor'
    /* The -metadata channel is used to allow syncing only manuscript metadata associated with a container */
    let metadataChannelName = docId + '-metadata'

    if (oldDoc) {
      await requireAccess([rwChannelName], userId)
    } else {
      requireUser(owners, userId)
    }

    channelDeferreds.push(
      channel(
        [
          rChannelName,
          rwChannelName,
          bibReadChannelName,
          ownerChannelName,
          annotatorChannelName,
          editorChannelName,
          metadataChannelName,
        ],
        docId
      )
    )
    accessDeferreds.push(
      access(owners, [
        rChannelName,
        rwChannelName,
        ownerChannelName,
        bibReadChannelName,
        metadataChannelName,
      ])
    )
    accessDeferreds.push(
      access(writers, [rChannelName, rwChannelName, bibReadChannelName, metadataChannelName])
    )
    accessDeferreds.push(access(viewers, [rChannelName, bibReadChannelName, metadataChannelName]))
    accessDeferreds.push(
      access(annotators, [
        rChannelName,
        bibReadChannelName,
        metadataChannelName,
        annotatorChannelName,
      ])
    )
    accessDeferreds.push(
      access(editors, [rChannelName, bibReadChannelName, metadataChannelName, editorChannelName])
    )
  } else if (
    objectTypeMatches('MPCollaboration') ||
    objectTypeMatches('MPInvitation') ||
    objectTypeMatches('MPContainerInvitation')
  ) {
    let isCollaboration = objectTypeMatches('MPCollaboration')
    let invitingUserID = doc.invitingUserID || (oldDoc && oldDoc.invitingUserID)

    if (isCollaboration) {
      if (hasMutated(undefined)) {
        // prettier-ignore
        throw({ forbidden: 'MPCollaboration is immutable' });
      }
      requireUser([invitingUserID], userId)
    } else {
      // Updates to MPInvitation/MPContainerInvitation should only be from admin
      //await requireAdmin();
    }

    channelDeferreds.push(channel([invitingUserID], docId))

    if (doc.invitedUserID) {
      channelDeferreds.push(channel([doc.invitedUserID], docId))
      accessDeferreds.push(access([doc.invitedUserID], [invitingUserID + '-read']))
    }

    if (objectTypeMatches('MPContainerInvitation')) {
      let rChannelName = doc.containerID + '-read'
      channelDeferreds.push(channel([rChannelName], docId))
    }
  } else if (objectTypeMatches('MPContainerRequest')) {
    //await requireAdmin();

    let ownerChannelName = doc.containerID + '-owner'
    channelDeferreds.push(channel([ownerChannelName], docId))
  } else if (objectTypeMatches('MPUserProfile')) {
    if (oldDoc === null || hasMutated('userID')) {
      //await requireAdmin();
    }
    let rwChannelName = doc.userID + '-readwrite'
    await requireAccess([rwChannelName], userId)
    let profileChannelName = doc.userID + '-read'
    channelDeferreds.push(channel([rwChannelName], docId))
    channelDeferreds.push(channel([profileChannelName], docId))
    // Grant access to MPUserProfile channel
    channelDeferreds.push(channel([doc._id + '-readwrite'], docId))
    accessDeferreds.push(access([doc.userID], [doc._id + '-readwrite']))
  } else if (objectTypeMatches('MPPreferences')) {
    let username = doc._id.replace(/^MPPreferences:/, '')
    requireUser([username], userId)
    channelDeferreds.push(channel([username], docId))
  } else if (objectTypeMatches('MPMutedCitationAlert')) {
    /*if (hasMutated('userID') || hasMutated('targetDOI')) {
      // await requireAdmin();
    }*/

    let userID = doc.userID
    requireUser([userID], userId)

    let channelName = userID + '-citation-alerts'
    channelDeferreds.push(channel([channelName], docId))
    accessDeferreds.push(access([userID], [channelName]))
  } else if (objectTypeMatches('MPCitationAlert')) {
    /*if (
      oldDoc === null ||
      hasMutated('userID') ||
      hasMutated('sourceDOI') ||
      hasMutated('targetDOI')
    ) {
      //await requireAdmin();
    }*/

    let userID = doc.userID

    if (hasMutated('isRead')) {
      requireUser([userID], userId)
    }

    let channelName = userID + '-citation-alerts'
    channelDeferreds.push(channel([channelName], docId))
    accessDeferreds.push(access([userID], [channelName]))
  } else if (objectTypeMatches('MPBibliographyItem')) {
    if (doc.keywordIDs) {
      for (let i = 0; i < doc.keywordIDs.length; i++) {
        let keywordID = doc.keywordIDs[i]
        let rChannel = keywordID + '-read'
        let rwChannel = keywordID + '-readwrite'

        await requireAccess([rwChannel], userId)
        channelDeferreds.push(channel([rChannel, rwChannel], docId))
      }
    }

    let channelName = doc.containerID + '-bibitems'
    channelDeferreds.push(channel([channelName], docId))
  } else if (
    objectTypeMatches('MPCorrection') ||
    objectTypeMatches('MPCommentAnnotation') ||
    objectTypeMatches('MPManuscriptNote')
  ) {
    let rwChannelName
    if (doc.contributions) {
      if (doc.contributions.length !== 1) {
        throw {
          forbidden: 'Only one contribution allowed',
        }
      }

      if (hasMutated('contributions')) {
        throw { forbidden: 'contributions cannot be mutated' }
      }

      let annotatorChannelName = doc.containerID + '-annotator'
      let editorChannelName = doc.containerID + '-editor'
      rwChannelName = doc.containerID + '-readwrite'
      let contributorChannelName = doc.contributions[0].profileID + '-readwrite'

      let isApprovingCorrections = !!(
        objectTypeMatches('MPCorrection') &&
        oldDoc &&
        hasMutated('status')
      )
      let isResolvingComments = !!(
        (objectTypeMatches('MPCommentAnnotation') || objectTypeMatches('MPManuscriptNote')) &&
        oldDoc &&
        hasMutated('resolved')
      )
      let isRejecting =
        (isApprovingCorrections && doc.status && doc.status.label === 'rejected') ||
        (isResolvingComments && doc.resolved === false)

      if (isRejecting) {
        await requireAccess([contributorChannelName, editorChannelName, rwChannelName], userId)
      } else if (isApprovingCorrections || isResolvingComments) {
        await requireAccess([editorChannelName, rwChannelName], userId)
      } else {
        //If the current user has access to the channel of the profile in the
        //contributions field, then the user must be the owner of the object
        await requireAccess([contributorChannelName], userId)
        await requireAccess([annotatorChannelName, editorChannelName, rwChannelName], userId)
      }
    }
    if (hasMutated('readBy')) {
      if (doc.readBy.includes(doc.contributions[0].profileID) && rwChannelName) {
        await requireAccess([rwChannelName], userId)
      } else {
        throw {
          forbidden: 'User can set status "read" only for himself and cannot unset it',
        }
      }
    }
  } else if (objectTypeMatches('MPManuscript') || objectTypeMatches('MPContributor')) {
    let channelName = doc.containerID + '-metadata'
    channelDeferreds.push(channel([channelName], docId))
  } else if (objectTypeMatches('MPCommit')) {
    let annotatorChannelName = doc.containerID + '-annotator'
    let editorChannelName = doc.containerID + '-editor'
    let rwChannelName = doc.containerID + '-readwrite'

    if (!hasMutated(undefined)) {
      await requireAccess([rwChannelName, annotatorChannelName, editorChannelName], userId)
    } else {
      await requireAccess([rwChannelName], userId)
    }
  }

  let containerId = doc.containerID

  if (
    containerId &&
    !objectTypeMatches('MPContainerInvitation') &&
    !objectTypeMatches('MPContainerRequest')
  ) {
    let rChannelName = containerId + '-read'
    let rwChannelName = containerId + '-readwrite'
    if (
      !objectTypeMatches('MPCorrection') &&
      !objectTypeMatches('MPCommentAnnotation') &&
      !objectTypeMatches('MPManuscriptNote') &&
      !objectTypeMatches('MPCommit')
    ) {
      await requireAccess([rwChannelName], userId)
    }
    channelDeferreds.push(channel([rChannelName, rwChannelName], docId))
  }

  // important, first clear all channels/accesses to this docId/userId
  // in a normal SG world, channels/accesses exist per document revision
  // for simplicity, in our NON-SG world, we drop & recreate them
  await AccessControlRepository.remove(docId)

  // first create channels to create accesses later
  await Promise.all(channelDeferreds.map((i) => i()))

  await Promise.all(accessDeferreds.map((i) => i()))
}
