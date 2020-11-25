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

import { TEST_TIMEOUT } from '../../../utilities/testSetup'
import {
  compareFunctions,
  DocumentMetadata,
  FunctionService,
  applicationFromSource,
  ensureValidApplicationSource,
  isFunctionSettingsLike
} from '../../../../src/DataAccess/FunctionService'
import { BucketKey } from '../../../../src/Config/ConfigurationTypes'
import { Database } from '../../../../src/DataAccess/Database'

jest.setTimeout(TEST_TIMEOUT)

jest.mock('request-promise-native')
const request = require('request-promise-native')

const emptyFuncA = function OnUpdate (_doc: any, _meta: DocumentMetadata) { return undefined }
const emptyFuncB = function OnUpdate (_doc: any, _meta: DocumentMetadata) { return }

const exampleAppA = applicationFromSource({
  appname: 'example-functions',
  updateCallback: emptyFuncA,
  depcfg: { buckets: [], metadata_bucket: 'app-state', source_bucket: 'data-bucket' },
  settings: {}
})

const exampleAppB = applicationFromSource({
  appname: 'example-functions',
  updateCallback: emptyFuncB,
  depcfg: { buckets: [], metadata_bucket: 'app-state', source_bucket: 'data-bucket' },
  settings: {}
})

function createTestMaterials () {
  const userDB: any = {
    bucketKey: BucketKey.User,
    httpBaseURL: 'https://derp.com:8091',
    documentMapper: { model: () => ({}) },
    configuration: { username: 'foo', password: 'bar' }
  }

  const dataDB: any = {
    bucketKey: BucketKey.Data,
    httpBaseURL: 'https://derp.com:8091',
    documentMapper: { model: () => ({}) },
    configuration: { username: 'foo', password: 'bar' }
  }

  const derivedDataDB: any = {
    bucketKey: BucketKey.DerivedData,
    httpBaseURL: 'https://derp.com:8091',
    documentMapper: { model: () => ({}) },
    configuration: { username: 'foo', password: 'bar' }
  }

  const discussionsDB: any = {
    bucketKey: BucketKey.Discussions,
    httpBaseURL: 'https://derp.com:8091',
    documentMapper: { model: () => ({}) },
    configuration: { username: 'foo', password: 'bar' }
  }

  const appStateDB: any = {
    bucketKey: BucketKey.AppState,
    documentMapper: { model: () => ({}) }
  }
  const fs = new FunctionService(
    userDB,
    dataDB,
    appStateDB,
    derivedDataDB,
    discussionsDB
  )
  return { userDB, dataDB, appStateDB, derivedDataDB, discussionsDB, fs }
}

describe('FunctionService: compareFunctions', () => {
  test('add function', () => {
    const funcDiffs = compareFunctions([exampleAppA], [])
    expect(funcDiffs.added.length).toEqual(1)
    expect(funcDiffs.updated.length).toEqual(0)
    expect(funcDiffs.removed.length).toEqual(0)
  })

  test('change function', () => {
    const funcDiffs = compareFunctions([exampleAppA], [exampleAppB])
    expect(funcDiffs.added.length).toEqual(0)
    expect(funcDiffs.updated.length).toEqual(1)
    expect(funcDiffs.removed.length).toEqual(0)
  })

  test('remove function', () => {
    const funcDiffs = compareFunctions([], [exampleAppA])
    expect(funcDiffs.added.length).toEqual(0)
    expect(funcDiffs.updated.length).toEqual(0)
    expect(funcDiffs.removed.length).toEqual(1)
  })
})

describe('FunctionService basics', () => {
  test('httpBaseURL', () => {
    const { fs, userDB, dataDB } = createTestMaterials()
    expect(fs.httpBaseURL(userDB)).toMatch(dataDB.httpBaseURL.replace('8091', '8096') + '/api/v1/functions')
  })

  test('bucketForKey has a bucket for only some keys', () => {
    const { fs, userDB, dataDB, appStateDB } = createTestMaterials()
    expect(fs.bucketForKey(BucketKey.User)).toEqual(userDB)
    expect(fs.bucketForKey(BucketKey.Data)).toEqual(dataDB)
    expect(fs.bucketForKey(BucketKey.AppState)).toEqual(appStateDB)
  })

  test('synchronize', () => {
    const userDB: any = {
      bucketKey: BucketKey.User,
      configuration: { username: 'test-fs-synchronize', password: 'foobar' },
      documentMapper: { model: () => ({}) }
    }

    const dataDB: any = {
      bucketKey: BucketKey.Data,
      configuration: { username: 'test-fs-synchronize', password: 'foobar' },
      documentMapper: { model: () => ({}) }
    }

    const derivedDataDB: any = {
      bucketKey: BucketKey.User,
      configuration: { username: 'test-fs-synchronize', password: 'foobar' },
      documentMapper: { model: () => ({}) }
    }

    const discussionsDB: any = {
      bucketKey: BucketKey.Discussions,
      configuration: { username: 'test-fs-synchronize', password: 'foobar' },
      documentMapper: { model: () => ({}) }
    }

    const appStateDB: any = {
      bucketKey: BucketKey.AppState,
      documentMapper: { model: () => ({}) }
    }

    const fs = new FunctionService(
      userDB,
      dataDB,
      appStateDB,
      derivedDataDB,
      discussionsDB
    )

    fs.httpBaseURL = jest.fn((_bucket: Database) => 'http://derp:8096')
    fs.getFunctions = jest.fn((_bucket: Database) => Promise.resolve([]))
    fs.postFunctions = jest.fn(() => Promise.resolve())

    return expect(fs.synchronize(BucketKey.User)).resolves.not.toThrow()
  })

  test('isFunctionSettingsLike', () => {
    expect(() => ensureValidApplicationSource({} as any)).toThrow()

    const validFuncSrc = {
      appname: 'foo',
      updateCallback: function foo (_doc: any, _meta: DocumentMetadata) { return },
      deleteCallback: undefined,
      depcfg: {
        buckets: [],
        metadata_bucket: 'user',
        source_bucket: 'source'
      },
      settings: {}
    }
    expect(() => ensureValidApplicationSource(validFuncSrc)).toThrow()
  })

  test('ensureValidApplicationSource', () => {
    expect(() => ensureValidApplicationSource({} as any)).toThrow()

    const invalidUpdateFuncNameSrc = {
      appname: 'foo',
      updateCallback: function foo (_doc: any, _meta: DocumentMetadata) { return },
      depcfg: {
        buckets: [],
        metadata_bucket: 'user',
        source_bucket: 'source'
      },
      settings: {}
    }
    expect(() => ensureValidApplicationSource(invalidUpdateFuncNameSrc)).toThrow()
    const validUpdateFuncNameSrc = { ...invalidUpdateFuncNameSrc, updateCallback: function OnUpdate (_doc: any, _meta: DocumentMetadata) { return } }
    expect(() => ensureValidApplicationSource(validUpdateFuncNameSrc)).not.toThrow()

    const invalidDeleteFuncNameSrc = {
      appname: 'foo',
      deleteCallback: function foo (_meta: DocumentMetadata) { return },
      depcfg: {
        buckets: [],
        metadata_bucket: 'user',
        source_bucket: 'source'
      },
      settings: {}
    }
    expect(() => ensureValidApplicationSource(invalidDeleteFuncNameSrc as any)).toThrow()
    const validDeleteFuncNameSrc = { ...invalidDeleteFuncNameSrc, deleteCallback: function OnDelete (_meta: DocumentMetadata) { return } }
    expect(() => ensureValidApplicationSource(validDeleteFuncNameSrc)).not.toThrow()
  })

  test('isFunctionSettingsLike', () => {
    expect(isFunctionSettingsLike({ processing_status: true })).toBeTruthy()
    expect(isFunctionSettingsLike({ processing_status: true, derp: false })).toBeFalsy()
  })

  test('getFunctions with non-200 status code should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 400, body: [] })))
    return expect(fs.getFunctions(userDB)).rejects.toThrow()
  })

  test('getFunctions with 200 status code but invalid body should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200, body: {} })))
    return expect(fs.getFunctions(userDB)).rejects.toThrow()
  })

  test('getFunctions with 200 status code and empty body should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200, body: [] })))
    return expect(fs.getFunctions(userDB)).resolves.toBeTruthy()
  })

  test('getFunctions with 200 status code and a body with a function definition it should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({
      statusCode: 200,
      body: [applicationFromSource({
        appname: 'foo',
        updateCallback: function OnUpdate (_doc: any, _meta: DocumentMetadata) { return },
        depcfg: { buckets: [], metadata_bucket: 'user', source_bucket: 'source' },
        settings: {}
      })]
    })))
    return expect(fs.getFunctions(userDB)).resolves.toBeTruthy()
  })

  test('getSettings with non-200 status code should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 400, body: [] })))
    return expect(fs.getSettings(userDB, 'foo')).rejects.toThrow()
  })

  test('getSettings with 200 status code but invalid (empty assumed invalid) body should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200, body: {} })))
    return expect(fs.getSettings(userDB, 'foo')).rejects.toThrow()
  })

  test('getSettings with 200 status code and a body with function settings it should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200, body: { deployment_status: true } })))
    return expect(fs.getSettings(userDB, 'foo')).resolves.toBeTruthy()
  })

  test('postSettings with 200 status code should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200 })))
    return expect(fs.postSettings(userDB, 'foo', {})).resolves.toBeFalsy()
  })

  test('postSettings with non-200 status code should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 400 })))
    return expect(fs.postSettings(userDB, 'foo', {})).rejects.toThrow()
  })

  test('deleteFunctions called with empty set of functions should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200 })))
    return expect(fs.deleteFunctions(userDB, [])).resolves.toBeFalsy()
  })

  test('deleteFunctions with a non-200 status code should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 400 })))
    return expect(fs.deleteFunctions(userDB, ['foo'])).rejects.toThrow()
  })

  test('deleteFunctions with 200 status code should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200 })))
    return expect(fs.deleteFunctions(userDB, ['foo'])).resolves.toBeTruthy()
  })

  test('deleteFunctions called with empty set of functions should not throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 200 })))
    return expect(fs.deleteFunctions(userDB, [])).resolves.toBeFalsy()
  })

  test('deleteFunctions with a non-200 status code should throw', () => {
    const { userDB, fs } = createTestMaterials()
    request.mockImplementation(() => Promise.resolve(({ statusCode: 400 })))
    return expect(fs.deleteFunctions(userDB, ['foo'])).rejects.toThrow()
  })
})
