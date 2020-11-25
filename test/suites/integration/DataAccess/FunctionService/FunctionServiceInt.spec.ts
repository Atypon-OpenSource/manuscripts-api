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

import { TEST_TIMEOUT } from '../../../../utilities/testSetup'
import { testDatabase } from '../../../../utilities/db'
import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { BucketKey } from '../../../../../src/Config/ConfigurationTypes'
import { FunctionService } from '../../../../../src/DataAccess/FunctionService'

import { log } from '../../../../../src/Utilities/Logger'

jest.setTimeout(TEST_TIMEOUT * 3)

let db: any = null
beforeAll(async () => {
  db = await testDatabase()
})

afterAll(() => {
  db.bucket.disconnect()
})

describe('FunctionService', () => {
  test('synchronize() should behave', async () => {
    const fs = new FunctionService(
      DIContainer.sharedContainer.userBucket,
      DIContainer.sharedContainer.dataBucket,
      DIContainer.sharedContainer.appStateBucket,
      DIContainer.sharedContainer.derivedDataBucket,
      DIContainer.sharedContainer.discussionsBucket
    )

    const dataBucket = fs.bucketForKey(BucketKey.Data)!
    const dataBucketBeforeAnything = await fs.getFunctions(dataBucket)

    // allowing for 0 and 1 because the undeploy below is so costly in time (close to a minute).
    expect(
      dataBucketBeforeAnything.length >= 0 &&
      dataBucketBeforeAnything.length <= 2
    ).toBeTruthy()

    await fs.synchronize(BucketKey.Data)

    const dataBucketBefore = await fs.getFunctions(dataBucket)
    expect(dataBucketBefore.length).toEqual(2)

    // undeploy
    // await Promise.all(userBucketBefore.map(f => fs.undeployFunction(userBucket, f.appname)))

    // delete test commented out as it's just way too slow (need to wait for ages for the function to be undeployed).
    // await retry(() => fs.deleteFunctions(userBucket, fs.functionDefinitions(BucketKey.User).map(fdef => fdef.appname)),
    //                                     { retries: 14, factor: 1.3, minTimeout: 5000, onRetry: (error: Error) => log.error(`Retrying deleting functions after synchronizing them...\n${error}`) })
    // log.info('Done deleting function.')
    // const funcsAfter = await fs.getFunctions(userBucket)
    // expect(funcsAfter.length).toEqual(0)
    log.info('Finished.')
  })
})
