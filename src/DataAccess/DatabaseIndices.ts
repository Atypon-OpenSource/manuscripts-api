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
// import { config } from '../Config/Config'

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

// Object with sets of fields to be indexed using GIN for each objectType
const indexesObj = {
  [BucketKey.Project]: {
    // The bucket level indicies
    bucket: [
      { fields: ['objectType'], gin: true },
      { fields: ['containerID'], gin: true },
    ],
    [ObjectTypes.ContainerInvitation]: [
      { fields: ['invitedUserEmail'], gin: true },
      { fields: ['containerID'], gin: true },
    ],
    [ObjectTypes.UserProfile]: [{ fields: ['userID'], gin: true }],
    [ObjectTypes.BibliographyItem]: [
      { fields: ['containerID'], gin: true },
      { fields: ['DOI'], gin: true },
    ],
    [ObjectTypes.Keyword]: [{ fields: ['containerID'], gin: true }],
    [ObjectTypes.UserProject]: [{ fields: ['projectID'], gin: true }],
    [ObjectTypes.ProjectInvitation]: [{ fields: ['projectID'], gin: true }],
    [ObjectTypes.ExternalFile]: [
      { fields: ['containerID'], gin: true },
      { fields: ['manuscriptID'], gin: true },
      { fields: ['publicUrl'], gin: true },
    ],
  } as any,
  [BucketKey.DerivedData]: {
    // The bucket level indicies
    bucket: [{ fields: ['objectType'], gin: true }],
    [ObjectTypes.UserCollaborator]: [
      { fields: ['userID'], gin: true },
      { fields: ['collaboratorID'], gin: true },
    ],
  } as any,
}

const arrayIndexesObj = {
  [BucketKey.Project]: {
    [ObjectTypes.Project]: [
      { fields: ['owners'], gin: true },
      { fields: ['writers'], gin: true },
      { fields: ['viewers'], gin: true },
    ],
    [ObjectTypes.BibliographyItem]: [{ fields: ['keywordIDs'], gin: true }],
  } as any,
  [BucketKey.DerivedData]: {
    [ObjectTypes.UserCollaborator]: [{ fields: ['projects'], gin: true }],
  } as any,
}

function buildIndex(
  objectType: string,
  bucketName: string,
  fields: string[],
  _gin: boolean
): Index {
  const indexName = `${objectType}__${fields.join('_')}`
  return {
    name: indexName,
    /*script: `CREATE INDEX \`${indexName}\` ON \`${bucketName}\`(${fields
      .map(field => `\`${field}\``)
      .join(',')}) WHERE (\`objectType\` = "${objectType}")${
      gin ? ' USING GIN' : ''
    };`*/
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING HASH ((data ->> ${fields
      .map((field) => `'${field}'`)
      .join(',')})) WHERE ((data ->> 'objectType')) = '${objectType}'`,
  }
}

function buildBucketIndex(bucketName: string, fields: string[], _gin: boolean): Index {
  const indexName = `${bucketName}__${fields.join('_')}`
  return {
    name: indexName,
    /*script: `CREATE INDEX \`${indexName}\` ON \`${bucketName}\`(${fields
      .map(field => `\`${field}\``)
      .join(',')})${gin ? ' USING GIN' : ''};`*/
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING HASH ((data ->> ${fields
      .map((field) => `'${field}'`)
      .join(',')}))`,
  }
}

function buildArrayIndex(
  objectType: string,
  bucketName: string,
  field: string,
  _gin: boolean
): Index {
  const indexName = `${objectType}__${field}`
  return {
    name: indexName,
    /*script: `CREATE INDEX \`${indexName}\` ON ${bucketName} (DISTINCT ARRAY userID FOR userID IN \`${field}\` END) WHERE objectType = '${objectType}' AND _deleted IS MISSING${
      gin ? ' USING GIN' : ''
    };`,*/
    script: `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${bucketName}" USING GIN ((data ->> '${field}')) WHERE ((data ->> 'objectType')) = '${objectType}'`,
  }
}

function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function indices(bucketKey: BucketKey): Index[] {
  if (bucketKey !== BucketKey.Project && bucketKey !== BucketKey.DerivedData) {
    return []
  }

  const bucketName = capitalizeFirstLetter(bucketKey) // config.DB.buckets[bucketKey]
  const indicesArray: Index[] = []

  for (const objectType of Object.keys(indexesObj[bucketKey])) {
    for (const fieldSets of indexesObj[bucketKey][objectType]) {
      const index =
        objectType === 'bucket'
          ? buildBucketIndex(bucketName, fieldSets.fields, fieldSets.gin)
          : buildIndex(objectType, bucketName, fieldSets.fields, fieldSets.gin)

      indicesArray.push(index)
    }
  }

  for (const objectType of Object.keys(arrayIndexesObj[bucketKey])) {
    for (const fieldSets of arrayIndexesObj[bucketKey][objectType]) {
      const index = buildArrayIndex(objectType, bucketName, fieldSets.fields[0], fieldSets.gin)

      indicesArray.push(index)
    }
  }

  return indicesArray
}
