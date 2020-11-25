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

import { clientApplicationsFromSplitString, scopeConfigurationsFromSplitString } from '../../../../src/Models/ClientApplicationModels'

describe('Scope configurations', () => {
  test('should be successfully deserialized from a configuration string', () => {
    const scopes = scopeConfigurationsFromSplitString('jupyterhub,random-secret,,15;pressroom,random-secret,,15;beacon,random-secret,,15', ';', ',')
    expect(scopes.length).toEqual(3)
    expect(scopes[0].name).toEqual('jupyterhub')
    expect(scopes[0].secret).toEqual('random-secret')
    expect(scopes[2].name).toEqual('beacon')
    expect(scopes[2].secret).toEqual('random-secret')
  })

  test('should fail to be deserialized with an invalid configuration string', () => {
    return expect(() => { const apps = clientApplicationsFromSplitString('derp', ';', ','); return apps }).toThrow()
  })
})

describe('Client applications', () => {
  test('should be successfully deserialized from a configuration string', () => {
    const apps = clientApplicationsFromSplitString('x,y,z;y,,v', ';', ',')
    expect(apps.length).toEqual(2)
    expect(apps[0]._id).toEqual('x')
    expect(apps[0].secret).toEqual('y')
    expect(apps[0].name).toEqual('z')
    expect(apps[1]._id).toEqual('y')
    expect(apps[1].secret).toEqual(null)
    expect(apps[1].name).toEqual('v')
  })

  test('should fail to be deserialized with an invalid configuration string', () => {
    return expect(() => { const apps = clientApplicationsFromSplitString('derp', ';', ','); return apps }).toThrow()
  })
})
