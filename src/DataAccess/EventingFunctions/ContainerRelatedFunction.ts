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
import { config } from '../../Config/Config'

// IMPORTANT: only use ES5 in these functions

// 'global' that the eventing functions require.
declare var log: EventingLogFunction
declare var derivedData: any
declare var N1qlQuery: any

// tslint:disable

export const containerRelatedFunction = (
  sourceBucket: Database,
  metadataBucket: Database
): FunctionApplicationSource => ({
  appname: 'container-related-functions',

  updateCallback: function OnUpdate (doc: any, meta: DocumentMetadata) {
    const containerTypes = ['MPProject', 'MPLibraryCollection', 'MPLibrary']

    function timestamp () {
      return new Date().getTime() / 1000
    }

    if (meta.id.startsWith('MPProject:')) {
      var isDeleted = doc['_deleted']
      if (isDeleted) {
        deleteProject()
      } else {
        updateProject()
      }
    }

    if (doc.containerID || containerTypes.includes(doc.objectType)) {
      containerSummary()
    }

    function deleteProject () {
      var projectID = meta.id
      // var usersIDs = [...doc.owners, ...doc.writers, ...doc.viewers]
      var usersIDs = [].concat(doc.owners).concat(doc.writers).concat(doc.viewers)

      if (doc.editors) {
        usersIDs.concat(doc.editors)
      }

      for (var userID of usersIDs) {
        var createdAt = timestamp()
        // var docWithID = { ...doc, _id: meta.id }
        var docWithID = Object.assign({}, doc, { _id: meta.id })
        if (docWithID._sync) {
          delete docWithID._sync
        }

        new N1qlQuery(
          "INSERT INTO derived_data (KEY, VALUE) VALUES ('MPProjectMemento:' || UUID(), {'objectType': 'MPProjectMemento', 'userID': $userID, 'projectID': $projectID, 'createdAt': $createdAt, 'updatedAt': $createdAt, 'project': " +
            JSON.stringify(docWithID) +
            ' });',
          {
            namedParams: {
              $userID: userID,
              $createdAt: createdAt,
              $projectID: projectID
            }
          }
        ).execQuery()
      }
    }

    function updateProject () {
      // var usersIDs = [...doc.owners, ...doc.writers, ...doc.viewers]
      var usersIDs = [].concat(doc.owners).concat(doc.writers).concat(doc.viewers)

      if (doc.editors) {
        usersIDs.concat(doc.editors)
      }

      for (var userID of usersIDs) {
        var projectMemento = new N1qlQuery(
          'SELECT META().id FROM derived_data WHERE objectType = "MPProjectMemento" AND userID = $userID AND projectID = $projectID;',
          {
            namedParams: {
              $userID: userID,
              $projectID: meta.id
            }
          }
        )

        for (var memento of projectMemento) {
          delete derivedData[memento.id]
        }
      }
    }

    function profileForUser (userID: string) {
      var collaboratorsProfiles = new N1qlQuery(
        'SELECT *, META().id FROM projects WHERE objectType = "MPUserProfile" AND userID = $userID',
        {
          namedParams: {
            $userID: userID
          }
        }
      )

      for (var collaboratorProfile of collaboratorsProfiles) {
        delete collaboratorProfile['projects']._sync

        // return {
        //   _id: collaboratorProfile.id,
        //   ...collaboratorProfile['projects']
        // }

        return Object.assign({}, collaboratorProfile['projects'], {
          _id: collaboratorProfile.id
        })
      }
    }

    // tslint:disable-next-line: cyclomatic-complexity
    function containerSummary () {
      var shouldDelete = shouldDeleteSummary()
      var containerType = selectContainerType()
      if (!containerType) {
        throw Error('Invalid container type')
      }

      var containerID = !doc.containerID ? meta.id : doc.containerID
      var summaryDocument = null
      try {
        summaryDocument = derivedData[containerType + ':' + containerID]
      } catch (e) {
        log('Summary document does not exist')
      }

      if (summaryDocument && !shouldDelete) {
        updateContainerSummary(summaryDocument, containerType, containerID)
      } else if (summaryDocument && shouldDelete) {
        deleteContainerSummary(containerType, containerID)
      } else if (!shouldDelete) {
        var projects = new N1qlQuery(
          'SELECT META().id FROM projects WHERE META().id = $projectID AND _deleted is MISSING',
          {
            namedParams: {
              $projectID: containerID
            }
          }
        )

        for (var _ of projects) {
          createContainerSummary(containerType, containerID)
        }
      }
    }

    function updateContainerSummary (
      document: any,
      containerType: string,
      containerID: string
    ) {
      if (!doc.containerID) {
        document.ownerProfiles = doc.owners.map(profileForUser)
        document.writerProfiles = doc.writers.map(profileForUser)
        document.viewerProfiles = doc.viewers.map(profileForUser)

        if (doc.editors) {
          document.editorsProfile = doc.editors.map(profileForUser)
        }
      }

      document.lastModifiedDocumentID = meta.id
      document.updatedAt = timestamp()
      derivedData[containerType + ':' + containerID] = document
    }

    function createContainerSummary (
      containerType: string,
      containerID: string
    ) {
      var stamp = timestamp()
      var summaryDocument = {
        objectType: containerType,
        containerID: containerID,
        createdAt: stamp,
        updatedAt: stamp,
        lastModifiedDocumentID: meta.id,
        ownerProfiles: [],
        writerProfiles: [],
        editorProfiles: [],
        viewerProfiles: []
      }

      if (!doc.containerID) {
        summaryDocument.ownerProfiles = doc.owners.map(profileForUser)
        summaryDocument.writerProfiles = doc.writers.map(profileForUser)
        summaryDocument.viewerProfiles = doc.viewers.map(profileForUser)

        if (doc.editors) {
          summaryDocument.editorProfiles = doc.editors.map(profileForUser)
        }
      }

      derivedData[containerType + ':' + containerID] = summaryDocument
    }

    function deleteContainerSummary (
      containerType: string,
      containerID: string
    ) {
      delete derivedData[containerType + ':' + containerID]
    }

    // tslint:disable-next-line: cyclomatic-complexity
    function selectContainerType () {
      if (
        (doc.containerID && doc.containerID.startsWith('MPProject:')) ||
        doc.objectType === 'MPProject'
      ) {
        return 'MPProjectSummary'
      } else if (
        (doc.containerID && doc.containerID.startsWith('MPLibrary:')) ||
        doc.objectType === 'MPLibrary'
      ) {
        return 'MPLibrarySummary'
      } else if (
        (doc.containerID &&
          doc.containerID.startsWith('MPLibraryCollection:')) ||
        doc.objectType === 'MPLibraryCollection'
      ) {
        return 'MPLibraryCollectionSummary'
      }

      return null
    }

    function shouldDeleteSummary (): boolean {
      return containerTypes.includes(doc.objectType) && doc['_deleted']
    }
  },
  depcfg: {
    buckets: [
      {
        alias: 'derivedData',
        bucket_name: config.DB.buckets.derivedData
      }
    ],
    metadata_bucket: metadataBucket.bucketName,
    source_bucket: sourceBucket.bucketName
  },
  settings: {
    deployment_status: true,
    description: 'Project memento and container summary functions',
    log_level: FunctionLogLevel.Debug,
    processing_status: true,
    worker_count: 3
  }
})
