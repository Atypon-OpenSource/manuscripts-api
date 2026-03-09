/*!
 * © 2026 Atypon Systems LLC
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

import { schema } from '@manuscripts/transform'
import { Transform } from 'prosemirror-transform'

import { DIContainer } from '../../../../../src/DIContainer/DIContainer'
import { AccessContext } from '../../../../../src/Models/AccessContextModels'
import { TEST_TIMEOUT } from '../../../../utilities/testSetup'

jest.setTimeout(TEST_TIMEOUT)

beforeEach(async () => {
  ;(DIContainer as any)._sharedContainer = null
  await DIContainer.init()
})

afterEach(() => {
  jest.clearAllMocks()
})

const comment = {
  type: 'comment',
  attrs: {
    id: 'MPCommentAnnotation:29D4335B',
    contents: 'comment content',
    target: 'MPParagraphElement:06D94BD3',
    resolved: false,
    contributions: [
      {
        _id: 'MPContribution:1164DD22',
        profileID: 'MPUserProfile:01',
        timestamp: 1,
        objectType: 'MPContribution',
      },
    ],
    originalText: '',
  },
}

describe('StepAccessService', () => {
  const accessContext: AccessContext = {
    userId: 'MPUserProfile:01',
    capabilities: {
      resolveOthersComment: true,
      resolveOwnComment: true,
      handleOthersComments: true,
      handleOwnComments: true,
      createComment: true,
    },
  }
  const doc = schema.nodes.doc.createAndFill()!
  const tr = new Transform(doc)
  tr.insert(10, schema.nodeFromJSON(comment))

  describe('validate', () => {
    it('has no access to resolve other comment', () => {
      accessContext.userId = 'MPUserProfile:02'
      accessContext.capabilities.resolveOthersComment = false
      tr.setNodeMarkup(10, undefined, { ...comment.attrs, resolved: true })
      const hasAccessToStep = DIContainer.sharedContainer.stepAccessService.validate(
        tr.steps[1],
        tr.docs[1],
        accessContext
      )
      expect(hasAccessToStep).toEqual(false)
    })
    it('has no access to resolve own comment', () => {
      accessContext.capabilities.resolveOwnComment = false
      tr.setNodeMarkup(10, undefined, { ...comment.attrs, resolved: true })
      const hasAccessToStep = DIContainer.sharedContainer.stepAccessService.validate(
        tr.steps[1],
        tr.docs[1],
        accessContext
      )
      expect(hasAccessToStep).toEqual(false)
    })
    it('has no access to create a comment', () => {
      accessContext.capabilities.createComment = false
      tr.insert(10, schema.nodeFromJSON(comment))
      const hasAccessToStep = DIContainer.sharedContainer.stepAccessService.validate(
        tr.steps[1],
        tr.docs[1],
        accessContext
      )
      expect(hasAccessToStep).toEqual(false)
    })
    it('has no access to delete a comment', () => {
      accessContext.capabilities.handleOwnComments = false
      tr.delete(10, 11)
      const hasAccessToStep = DIContainer.sharedContainer.stepAccessService.validate(
        tr.steps[1],
        tr.docs[1],
        accessContext
      )
      expect(hasAccessToStep).toEqual(false)
    })
  })
})
