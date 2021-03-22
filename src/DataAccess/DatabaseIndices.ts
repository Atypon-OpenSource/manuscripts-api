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
import { config } from '../Config/Config'

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

// Object with sets of fields to be indexed using GSI for each objectType
const indexesObj = {
  [BucketKey.Data]: {
    // The bucket level indicies
    bucket: [
      { fields: ['objectType'], gsi: true },
      { fields: ['containerID'], gsi: true }
    ],
    [ObjectTypes.ContainerInvitation]: [
      { fields: ['invitedUserEmail'], gsi: true },
      { fields: ['containerID'], gsi: true }
    ],
    [ObjectTypes.UserProfile]: [{ fields: ['userID'], gsi: true }],
    [ObjectTypes.BibliographyItem]: [
      { fields: ['containerID'], gsi: true },
      { fields: ['DOI'], gsi: true }
    ],
    [ObjectTypes.Keyword]: [{ fields: ['containerID'], gsi: true }],
    [ObjectTypes.UserProject]: [{ fields: ['projectID'], gsi: true }],
    [ObjectTypes.ProjectInvitation]: [{ fields: ['projectID'], gsi: true }],
    [ObjectTypes.ExternalFile]: [{ fields: ['publicUrl'], gsi: true }]
  } as any,
  [BucketKey.DerivedData]: {
    // The bucket level indicies
    bucket: [
      { fields: ['objectType'], gsi: true }
    ],
    [ObjectTypes.ProjectMemento]: [{ fields: ['userID'], gsi: true }, { fields: ['projectID'], gsi: true }],
    [ObjectTypes.UserCollaborator]: [
      { fields: ['userID'], gsi: true },
      { fields: ['collaboratorID'], gsi: true }
    ]
  } as any
}

const arrayIndexesObj = {
  [BucketKey.Data]: {
    [ObjectTypes.Project]: [
      { fields: ['owners'], gsi: true },
      { fields: ['writers'], gsi: true },
      { fields: ['viewers'], gsi: true }
    ],
    [ObjectTypes.BibliographyItem]: [{ fields: ['keywordIDs'], gsi: true }]
  } as any,
  [BucketKey.DerivedData]: {
    [ObjectTypes.UserCollaborator]: [{ fields: ['projects'], gsi: true }]
  } as any
}

function buildIndex (
  objectType: string,
  bucketName: string,
  fields: string[],
  gsi: boolean
): Index {
  const indexName = `${objectType}__${fields.join('_')}`
  return {
    name: indexName,
    script: `CREATE INDEX \`${indexName}\` ON \`${bucketName}\`(${fields
      .map(field => `\`${field}\``)
      .join(',')}) WHERE (\`objectType\` = "${objectType}")${
      gsi ? ' USING GSI' : ''
    };`
  }
}

function buildBucketIndex (
  bucketName: string,
  fields: string[],
  gsi: boolean
): Index {
  const indexName = `${bucketName}__${fields.join('_')}`
  return {
    name: indexName,
    script: `CREATE INDEX \`${indexName}\` ON \`${bucketName}\`(${fields
      .map(field => `\`${field}\``)
      .join(',')})${gsi ? ' USING GSI' : ''};`
  }
}

function buildArrayIndex (
  objectType: string,
  bucketName: string,
  field: string,
  gsi: boolean
): Index {
  const indexName = `${objectType}__${field}`
  return {
    name: indexName,
    script: `CREATE INDEX \`${indexName}\` ON ${bucketName} (DISTINCT ARRAY userID FOR userID IN \`${field}\` END) WHERE objectType = '${objectType}' AND _deleted IS MISSING${
      gsi ? ' USING GSI' : ''
    };`
  }
}

export function indices (bucketKey: BucketKey): Index[] {
  if (bucketKey !== BucketKey.Data && bucketKey !== BucketKey.DerivedData) {
    return []
  }

  const bucketName = config.DB.buckets[bucketKey]
  const indicesArray: Index[] = []

  for (const objectType of Object.keys(indexesObj[bucketKey])) {
    for (const fieldSets of indexesObj[bucketKey][objectType]) {
      const index =
        objectType === 'bucket'
          ? buildBucketIndex(bucketName, fieldSets.fields, fieldSets.gsi)
          : buildIndex(objectType, bucketName, fieldSets.fields, fieldSets.gsi)

      indicesArray.push(index)
    }
  }

  for (const objectType of Object.keys(arrayIndexesObj[bucketKey])) {
    for (const fieldSets of arrayIndexesObj[bucketKey][objectType]) {
      const index = buildArrayIndex(
        objectType,
        bucketName,
        fieldSets.fields[0],
        fieldSets.gsi
      )

      indicesArray.push(index)
    }
  }

  return indicesArray
}
