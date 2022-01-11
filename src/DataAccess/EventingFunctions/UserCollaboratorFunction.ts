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

import {
  DocumentMetadata,
  EventingLogFunction,
  FunctionApplicationSource,
  FunctionLogLevel
} from '../FunctionService'
import { Database } from '../Database'
import { UserProfile } from '@manuscripts/manuscripts-json-schema'

// IMPORTANT: only use ES5 in these functions

// tslint:disable

// 'global' that the eventing functions require.
declare var log: EventingLogFunction
declare var derivedData: any
declare var N1qlQuery: any

export const userCollaboratorFunction = (
  sourceBucket: Database,
  metadataBucket: Database
): FunctionApplicationSource => ({
  appname: 'user-collaborator-functions',
  updateCallback: function OnUpdate (doc: any, meta: DocumentMetadata) {
    var sourceBucketName = 'projects'
    var derivedBucketName = 'derived_data'

    if (meta.id.startsWith('MPUserProfile:')) {
      onUpdateUserProfile()
    } else if (
      meta.id.startsWith('MPProject:') ||
      meta.id.startsWith('MPLibrary:') ||
      meta.id.startsWith('MPLibraryCollection:')
    ) {
      onUpdateContainer()
    }

    function timestamp () {
      return new Date().getTime() / 1000
    }

    function collaboratorUserProfile (userID: string): UserProfile | null {
      try {
        var userProfile = new N1qlQuery(
          'SELECT META().id, META().xattrs._sync, * FROM ' +
            sourceBucketName +
            ' WHERE objectType = "MPUserProfile" AND userID = $userID;',
          { namedParams: { $userID: userID } }
        )

        for (var profile of userProfile) {
          if (
            profile &&
            profile[sourceBucketName] &&
            profile[sourceBucketName]._sync
          ) {
            delete profile[sourceBucketName]._sync
          }

          // return { ...profile[sourceBucketName], _id: profile.id }

          return Object.assign({}, profile[sourceBucketName], { _id: profile.id })

        }

        return null
      } catch (e) {
        log('User does not have UserProfile')
        return null
      }
    }

    function createProjectMemento (userID: string, role: string) {
      var projectID = meta.id
      var createdAt = timestamp()
      // var docWithID = {
      //   ...doc,
      //   _id: projectID
      // }

      var docWithID = Object.assign({}, doc, { _id: projectID })

      switch (role) {
        case 'owner':
          docWithID.owners.push(userID)
          break
        case 'writer':
          docWithID.writers.push(userID)
          break
        case 'viewer':
          docWithID.viewers.push(userID)
          break
      }

      if (docWithID._sync) {
        delete docWithID._sync
      }

      new N1qlQuery(
        'INSERT INTO ' +
          derivedBucketName +
          " (KEY, VALUE) VALUES ('MPProjectMemento:' || UUID(), {'objectType': 'MPProjectMemento', 'userID': $userID, 'projectID': $projectID, 'createdAt': $createdAt, 'updatedAt': $createdAt, 'project': " +
          JSON.stringify(docWithID) +
          ' });',
        {
          namedParams: {
            $userID: userID,
            $projectID: projectID,
            $createdAt: createdAt
          }
        }
      ).execQuery()
    }

    function removeDeletedContainerFromUserCollaborator (
      containerUsersIDs: string[],
      userCollaboratorIDs: { id: string }[],
      role: string
    ) {
      var usersIDs = doc.owners.concat(doc.writers, doc.viewers)

      for (var user of userCollaboratorIDs) {
        if (
          containerUsersIDs.includes(
            derivedData[user.id].collaboratorProfile.userID
          ) ||
          usersIDs.includes(derivedData[user.id].userID)
        ) {
          var userCollaborator = derivedData[user.id]
          var index = userCollaborator.containers[role].indexOf(meta.id)
          userCollaborator.containers[role].splice(index, 1)

          if (
            !userCollaborator.containers.owner.length &&
            !userCollaborator.containers.writer.length &&
            !userCollaborator.containers.viewer.length
          ) {
            delete derivedData[user.id]
          } else {
            userCollaborator['updatedAt'] = timestamp()
            derivedData[user.id] = userCollaborator
          }
        }
      }
    }

    function removeContainerFromUserCollaborator (
      containerUsersIDs: string[],
      userCollaboratorIDs: { id: string }[],
      role: string
    ) {
      var usersIDs = doc.owners.concat(doc.writers, doc.viewers)

      for (var user of userCollaboratorIDs) {
        var isUserIDMissing = !usersIDs.includes(derivedData[user.id].userID)
        var isUserProfileMissing = !containerUsersIDs.includes(
          derivedData[user.id].collaboratorProfile.userID
        )

        if (isUserProfileMissing || isUserIDMissing) {
          var userCollaborator = derivedData[user.id]
          var index = userCollaborator.containers[role].indexOf(meta.id)
          userCollaborator.containers[role].splice(index, 1)

          if (isUserIDMissing) {
            createProjectMemento(derivedData[user.id].userID, role)
          }

          if (
            !userCollaborator.containers.owner.length &&
            !userCollaborator.containers.writer.length &&
            !userCollaborator.containers.viewer.length
          ) {
            delete derivedData[user.id]
          } else {
            userCollaborator['updatedAt'] = timestamp()
            derivedData[user.id] = userCollaborator
          }
        }
      }
    }

    function createUserCollaborator (
      userID: string,
      collaborators: string[],
      role: string
    ) {
      var containerID = meta.id

      for (var collaborator of collaborators) {
        if (userID !== collaborator) {
          var collaboratorProfile = collaboratorUserProfile(collaborator)
          if (collaboratorProfile) {
            var userCollaboratorID = new N1qlQuery(
              'SELECT META().id FROM ' +
                derivedBucketName +
                ' WHERE userID = $userID AND collaboratorID = $collaboratorID;',
              {
                namedParams: {
                  $userID: userID,
                  $collaboratorID: collaboratorProfile._id
                }
              }
            )

            var userCollaborator = null

            for (var ucID of userCollaboratorID) {
              log('Update user collaborator.')
              userCollaborator = derivedData[ucID.id]

              if (!userCollaborator.containers[role].includes(containerID)) {
                userCollaborator.containers[role].push(containerID)
                userCollaborator['updatedAt'] = timestamp()
                derivedData[ucID.id] = userCollaborator
              }
            }

            if (!userCollaborator) {
              log('Create user collaborator.')
              var createdAt = timestamp()
              var containerRoles: any = {
                owner: [],
                writer: [],
                viewer: []
              }

              containerRoles[role] = [containerID]

              try {
                new N1qlQuery(
                  'INSERT INTO ' +
                    derivedBucketName +
                    " (KEY, VALUE) VALUES ('MPUserCollaborator:' || UUID(), {'objectType': 'MPUserCollaborator', 'userID': $userID, 'collaboratorID': $collaboratorID, 'containers': " +
                    JSON.stringify(containerRoles) +
                    ", 'createdAt': $createdAt, 'updatedAt': $createdAt, 'collaboratorProfile': " +
                    JSON.stringify(collaboratorProfile) +
                    ' });',
                  {
                    namedParams: {
                      $collaboratorID: collaboratorProfile._id,
                      $userID: userID,
                      $createdAt: createdAt
                    }
                  }
                ).execQuery()
              } catch (e) {
                log('User collaborator creation failed:' + JSON.stringify(e))
              }
            }
          } else {
            log('Collaborator Profile could not be found.')
          }
        }
      }
    }

    function onUpdateUserProfile () {
      var isDeleted = doc['_deleted']
      if (isDeleted) {
        deleteUserCollaborator()
      } else {
        updateUserCollaborator()
      }
    }

    function deleteUserCollaborator () {
      log('User Profile deleted: deleting user collaborator.')
      var userCollaboratorsIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE collaboratorID = $profileID',
        { namedParams: { $profileID: meta.id } }
      )

      for (var userCollaboratorID of userCollaboratorsIDs) {
        var userID =
          derivedData[userCollaboratorID.id].collaboratorProfile.userID

        var userCollaboratorsIDsFromUserID = new N1qlQuery(
          'SELECT META().id FROM ' +
            derivedBucketName +
            ' WHERE userID = $userID',
          { namedParams: { $userID: userID } }
        )

        for (var userCollaboratorIDFromUserID of userCollaboratorsIDsFromUserID) {
          delete derivedData[userCollaboratorIDFromUserID.id]
        }

        delete derivedData[userCollaboratorID.id]
      }
    }

    function updateUserCollaborator () {
      log('User Profile updated: updating user collaborator.')
      var userCollaboratorsIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE collaboratorID = $profileID',
        { namedParams: { $profileID: meta.id } }
      )

      // var docWithID = { ...doc, _id: meta.id }
      var docWithID = Object.assign({}, doc, { _id: meta.id })
      delete docWithID._sync

      for (var ucID of userCollaboratorsIDs) {
        var userCollaborator = derivedData[ucID.id]
        userCollaborator['collaboratorProfile'] = docWithID
        derivedData[ucID.id] = userCollaborator
      }
    }

    function onUpdateContainer () {
      var isDeleted = doc['_deleted']
      if (isDeleted) {
        deleteContainer()
      } else {
        updateContainer()
      }
    }

    function deleteContainer () {
      log('Project deleted: remove project id from user collaborators.')
      var containerID = meta.id

      var ownersIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.owner SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      ) // Get all ids of userCollaborators that own this container
      removeDeletedContainerFromUserCollaborator(
        doc.owners,
        ownersIDs,
        'owner'
      )

      var writersIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.writer SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      )

      removeDeletedContainerFromUserCollaborator(
        doc.writers,
        writersIDs,
        'writer'
      )

      var viewersIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.viewer SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      )

      removeDeletedContainerFromUserCollaborator(
        doc.viewers,
        viewersIDs,
        'viewer'
      )
    }

    function updateContainer () {
      log('Project updated: add/remove project id to/from user collaborators.')
      var containerID = meta.id
      var owners = doc.owners
      var writers = doc.writers
      var viewers = doc.viewers.filter((x: any) => x !== '*')
      var usersIDs = owners.concat(writers, viewers)

      for (var userID of usersIDs) {
        createUserCollaborator(userID, owners, 'owner')
        createUserCollaborator(userID, writers, 'writer')
        createUserCollaborator(userID, viewers, 'viewer')
      }

      var ownersIDs = new N1qlQuery(
        'SELECT META().id, userID FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.owner SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      ) // Get all ids of userCollaborators who are owners on this container

      removeContainerFromUserCollaborator(doc.owners, ownersIDs, 'owner')

      var writersIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.writer SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      ) // Get all ids of userCollaborators who are writers on this container

      removeContainerFromUserCollaborator(doc.writers, writersIDs, 'writer')

      var viewersIDs = new N1qlQuery(
        'SELECT META().id FROM ' +
          derivedBucketName +
          ' WHERE ANY id IN containers.viewer SATISFIES id = $containerID END;',
        { namedParams: { $containerID: containerID } }
      ) // Get all ids of userCollaborators who are viewers on this container

      removeContainerFromUserCollaborator(doc.viewers, viewersIDs, 'viewer')
    }
  },
  depcfg: {
    buckets: [
      {
        alias: 'derivedData',
        bucket_name: 'derived_data'
      }
    ],
    metadata_bucket: metadataBucket.bucketName,
    source_bucket: sourceBucket.bucketName
  },
  settings: {
    deployment_status: true,
    description: 'User collaborator related functions',
    log_level: FunctionLogLevel.Debug,
    processing_status: true,
    worker_count: 3
  }
})
