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

import { ObjectTypes } from '@manuscripts/manuscripts-json-schema'

import { BucketKey } from '../Config/ConfigurationTypes'

export interface Index {
  /**
   * Index name
   */
  name: string
  /**
   * index manipulation script.
   */
  script: string
}

// Object with sets of fields to be indexed
const projectIndexesObj = {
  [BucketKey.Project]: {
    // The bucket level indicies
    bucket: [{ fields: ['objectType'] }, { fields: ['containerID'] }],
    [ObjectTypes.ContainerInvitation]: [
      { fields: ['invitedUserEmail'] },
      { fields: ['containerID'] },
      { fields: ['expiry'], indexType: 'BTREE' },
    ],
    [ObjectTypes.UserProfile]: [{ fields: ['userID'] }],
    [ObjectTypes.BibliographyItem]: [{ fields: ['containerID'] }, { fields: ['DOI'] }],
    [ObjectTypes.Keyword]: [{ fields: ['containerID'] }],
    [ObjectTypes.UserProject]: [{ fields: ['projectID'] }],
    [ObjectTypes.ProjectInvitation]: [
      { fields: ['projectID'] },
      { fields: ['expiry'], indexType: 'BTREE' },
    ],
    [ObjectTypes.Invitation]: [{ fields: ['expiry'], indexType: 'BTREE' }],
    [ObjectTypes.ExternalFile]: [
      { fields: ['containerID'] },
      { fields: ['manuscriptID'] },
      { fields: ['publicUrl'] },
    ],
  } as any,
} as any

const userIndexesObj = {
  [BucketKey.User]: {
    // The bucket level indicies
    bucket: [{ fields: ['_type'] }],
    ['UserToken']: [{ fields: ['expiry'], indexType: 'BTREE' }],
    ['InvitationToken']: [{ fields: ['expiry'], indexType: 'BTREE' }],
    ['UserEvent']: [{ fields: ['expiry'], indexType: 'BTREE' }],
    ['User']: [{ fields: ['deleteAt'], indexType: 'BTREE' }],
    [ObjectTypes.UserCollaborator]: [{ fields: ['projects'], indexType: 'GIN' }],
  } as any,
} as any

const arrayIndexesObj = {
  [BucketKey.Project]: {
    [ObjectTypes.Project]: [
      { fields: ['owners'] },
      { fields: ['writers'] },
      { fields: ['viewers'] },
    ],
    [ObjectTypes.BibliographyItem]: [{ fields: ['keywordIDs'] }],
  } as any,
} as any

function buildSGIndex(
  objectType: string,
  bucketName: string,
  fields: string[],
  _indexType: string
): Index {
  const indexName = `${objectType}__${fields.join('_')}`
  const indexType = _indexType || 'HASH'
  return {
    name: indexName,
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING ${indexType} ((data ->> ${fields
      .map((field) => `'${field}'`)
      .join(',')})) WHERE ((data ->> 'objectType')) = '${objectType}'`,
  }
}

function buildSQLIndex(
  _type: string,
  bucketName: string,
  fields: string[],
  _indexType: string
): Index {
  const indexName = `${_type}__${fields.join('_')}`
  const indexType = _indexType || 'HASH'
  return {
    name: indexName,
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING ${indexType} ((data ->> ${fields
      .map((field) => `'${field}'`)
      .join(',')})) WHERE ((data ->> '_type')) = '${_type}'`,
  }
}

function buildBucketIndex(bucketName: string, fields: string[]): Index {
  const indexName = `${bucketName}__${fields.join('_')}`
  return {
    name: indexName,
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING HASH ((data ->> ${fields
      .map((field) => `'${field}'`)
      .join(',')}))`,
  }
}

function buildArrayIndex(objectType: string, bucketName: string, field: string): Index {
  const indexName = `${objectType}__${field}`
  return {
    name: indexName,
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING GIN ((data ->> '${field}')) WHERE ((data ->> 'objectType')) = '${objectType}'`,
  }
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function indices(bucketKey: BucketKey): Index[] {
  const bucketName = capitalizeFirstLetter(bucketKey)
  const indicesArray: Index[] = []

  if (projectIndexesObj[bucketKey]) {
    for (const objectType of Object.keys(projectIndexesObj[bucketKey])) {
      for (const fieldSets of projectIndexesObj[bucketKey][objectType]) {
        const index =
          objectType === 'bucket'
            ? buildBucketIndex(bucketName, fieldSets.fields)
            : buildSGIndex(objectType, bucketName, fieldSets.fields, fieldSets.indexType)

        indicesArray.push(index)
      }
    }
  }

  if (userIndexesObj[bucketKey]) {
    for (const _type of Object.keys(userIndexesObj[bucketKey])) {
      for (const fieldSets of userIndexesObj[bucketKey][_type]) {
        const index =
          _type === 'bucket'
            ? buildBucketIndex(bucketName, fieldSets.fields)
            : buildSQLIndex(_type, bucketName, fieldSets.fields, fieldSets.indexType)

        indicesArray.push(index)
      }
    }
  }

  if (arrayIndexesObj[bucketKey]) {
    for (const objectType of Object.keys(arrayIndexesObj[bucketKey])) {
      for (const fieldSets of arrayIndexesObj[bucketKey][objectType]) {
        const index = buildArrayIndex(objectType, bucketName, fieldSets.fields[0])

        indicesArray.push(index)
      }
    }
  }

  return indicesArray
}
