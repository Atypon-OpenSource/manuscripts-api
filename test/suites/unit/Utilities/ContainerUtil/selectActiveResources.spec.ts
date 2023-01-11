/*!
 * © 2019 Atypon Systems LLC
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

import { Model, ParagraphElement, Section } from '@manuscripts/json-schema'
import deepFreeze from 'deep-freeze'

import {
  extractDocumentIDs,
  identifyChildrenFromProperty,
  selectActiveResources,
  walkChildren,
} from '../../../../../src/Utilities/ContainerUtils/selectActiveResources'

interface ContainedModel extends Model {
  containerID: string
  manuscriptID?: string
  // [key: string]: any
}

const withRequiredProperties = <T extends ContainedModel>(model: Partial<T>): T =>
  ({
    createdAt: 0,
    updatedAt: 0,
    containerID: 'MPProject:project-1',
    manuscriptID: 'MPManuscript:manuscript-1',
    ...model,
  } as T) // tslint:disable-line:no-object-literal-type-assertion

const data: ContainedModel[] = [
  {
    objectType: 'MPProject',
    _id: 'MPProject:project',
  },
  {
    objectType: 'MPManuscript',
    _id: 'MPManuscript:manuscript-1',
  },
  {
    objectType: 'MPContributor',
    _id: 'MPContributor:author-1',
    role: 'author',
    affiliations: ['MPAffiliation:affiliation-1'],
  },
  {
    objectType: 'MPAffiliation',
    _id: 'MPAffiliation:affiliation-1',
  },
  {
    objectType: 'MPContributor',
    _id: 'MPContributor:deleted-author',
    role: null,
  },
  {
    objectType: 'MPSection',
    _id: 'MPSection:section-1',
    elementIDs: ['MPParagraphElement:element-1', 'MPParagraphElement:element-2'],
  },
  {
    objectType: 'MPSection',
    _deleted: true,
    _id: 'MPSection:deleted-section',
  },
  {
    containingObject: 'MPFootnotesElement:30911119-444A-4C73-B66B-4E18533BDD7E',
    contents:
      '<div xmlns="http://www.w3.org/1999/xhtml" class="footnote-text" id="MPFootnote:00062739-B5CC-44FD-BAA1-81ECC2147695" data-kind="footnote" data-category="financial-disclosure"><p id="MPParagraphElement:6A66709F-0421-43DA-95DB-2A4BA46CF6E6">This study was supported by Sanofi Genzyme (Cambridge, MA, USA) and Regeneron Pharmaceuticals, Inc. (Tarrytown, NY, USA), which developed sarilumab.</p></div>',
    kind: 'footnote',
    category: 'MPFootnoteCategory:financial-disclosure',
    _id: 'MPFootnote:00062739-B5CC-44FD-BAA1-81ECC2147695',
    objectType: 'MPFootnote',
  },
  {
    objectType: 'MPSection',
    _id: 'MPSection:section-in-deleted-manuscript',
    manuscriptID: 'MPManuscript:deleted-manuscript',
    elementIDs: ['MPParagraphElement:element-in-deleted-section'],
  },
  {
    objectType: 'MPParagraphElement',
    _id: 'MPParagraphElement:element-1',
  },
  {
    objectType: 'MPParagraphElement',
    _id: 'MPParagraphElement:element-2',
    contents: '<span id="MPCitation:citation-1">Some text</span>',
  },
  {
    objectType: 'MPParagraphElement',
    _deleted: true,
    _id: 'MPParagraphElement:deleted-element',
  },
  {
    objectType: 'MPParagraphElement',
    _id: 'MPParagraphElement:element-in-deleted-section',
  },
  {
    objectType: 'MPCitation',
    _id: 'MPCitation:citation-1',
  },
  {
    objectType: 'MPCitation',
    _id: 'MPCitation:deleted-citation',
  },
  {
    objectType: 'MPExternalFile',
    _id: 'MPExternalFile:externalFile-1',
  },
  {
    objectType: 'MPCorresponding',
    _id: 'MPCorresponding:corresp-1',
  },
  {
    _id: 'MPSupplement:supp-1',
    objectType: 'MPSupplement',
    title: 'some Title',
    href: 'attachment:7d9d686b-5488-44a5-a1c5-46351e7f9312',
    MIME: 'mimeType/mime-subType',
  },
].map(withRequiredProperties)

deepFreeze(data)

const ids = (project: Model[]) => project.map((doc) => doc._id)

test('extractDocumentIDs should extract ids from a contents string', () => {
  const contents =
    '<p xmlns="http://www.w3.org/1999/xhtml" id="MPParagraphElement:element-1" class="MPElement MPParagraphStyle_7EAB5784-717B-4672-BD59-8CA324FB0637" data-object-type="MPParagraphElement"><span class="citation" data-reference-id="MPCitation:citation-1">A hyperlink</span></p>'

  const result = extractDocumentIDs(contents)

  expect(result).toHaveLength(2)
})

describe('identifyChildrenFromProperty', () => {
  describe('with array of strings', () => {
    it('should find ids', () => {
      const value = ['MPParagraphElement:element-1', 'MPParagraphElement:element-2']
      const result = identifyChildrenFromProperty<Section>(value, 'elementIDs', data)

      expect(ids(result)).toContain('MPParagraphElement:element-1')
    })
  })

  describe('with string', () => {
    it('should find ids', () => {
      const value = 'MPParagraphElement:element-1'
      const result = identifyChildrenFromProperty(value, '_id', data)

      expect(ids(result)).toContain('MPParagraphElement:element-1')
    })
  })

  describe('with object', () => {
    it('should find ids', () => {
      const value = {
        _id: 'MPAffiliation:affiliation-1',
        institution: 'Cunning University',
      }
      const result = identifyChildrenFromProperty(value, '_id', data)

      expect(ids(result)).toContain('MPAffiliation:affiliation-1')
    })
  })

  describe('with an array of objects', () => {
    it('should find ids', () => {
      const value = [
        {
          _id: 'MPContributor:contributor-1',
          name: 'Janine Melnitz',
        },
      ]
      const result = identifyChildrenFromProperty(value, '_id', data)

      expect(ids(result)).toContain('MPContributor:contributor-1')
    })
  })

  describe('with string containing ids', () => {
    const value =
      '<p xmlns="http://www.w3.org/1999/xhtml" id="MPParagraphElement:element-1" class="MPElement MPParagraphStyle_7EAB5784-717B-4672-BD59-8CA324FB0637" data-object-type="MPParagraphElement"><span class="citation" data-reference-id="MPCitation:citation-1">A hyperlink</span></p>'

    it('should find ids when key is contents', () => {
      const result = identifyChildrenFromProperty<ParagraphElement>(value, 'contents', data)
      expect(ids(result)).toContain('MPCitation:citation-1')
    })

    it('should ignore the results for other keys', () => {
      const result = identifyChildrenFromProperty(value, 'objectType', data)
      expect(ids(result)).toHaveLength(0)
    })
  })

  describe('with miscellaneous value', () => {
    it('ignores miscellaneous values', () => {
      const value = /notathingwecareabout/
      const result = identifyChildrenFromProperty(value, '_id', data)
      expect(ids(result)).toHaveLength(0)
    })
  })
})

describe('walkChildren', () => {
  it('should walk through all the child documents', () => {
    const toVisit = [
      withRequiredProperties<Section>({
        objectType: 'MPSection',
        _id: 'MPSection:section-1',
        elementIDs: ['MPParagraphElement:element-1'],
      }),
    ]

    const visited: Set<string> = new Set()

    const children = walkChildren(data, visited, toVisit)
    expect(children.has('MPParagraphElement:element-1')).toBe(true)
    expect(children.has('MPParagraphElement:deleted-element')).toBe(false)
  })
})

describe('selectActiveResources', () => {
  const result = ids(selectActiveResources(data))

  it('should include all the active resources', () => {
    expect(result).toContain('MPProject:project')
    expect(result).toContain('MPManuscript:manuscript-1')
    expect(result).toContain('MPContributor:author-1')
    expect(result).toContain('MPAffiliation:affiliation-1')
    expect(result).toContain('MPSection:section-1')
    expect(result).toContain('MPParagraphElement:element-1')
    expect(result).toContain('MPCitation:citation-1')
    expect(result).toContain('MPFootnote:00062739-B5CC-44FD-BAA1-81ECC2147695')
    expect(result).toContain('MPCorresponding:corresp-1')
    expect(result).toContain('MPSupplement:supp-1')
  })

  it('should leave out all other resources', () => {
    expect(result).not.toContain('MPContributor:deleted-author')
    expect(result).not.toContain('MPSection:deleted-section')
    expect(result).not.toContain('MPParagraphElement:deleted-element')
    expect(result).not.toContain('MPParagraphElement:element-in-deleted-section')
    expect(result).not.toContain('MPPCitation:deleted-citation')
    expect(result).not.toContain('MPSection:deleted-section')
  })

  it('should handle the case when there are no active manuscripts', () => {
    const data = [
      {
        objectType: 'MPProject',
        _id: 'MPProject:project',
      },
    ].map(withRequiredProperties)
    expect(() => selectActiveResources(data)).not.toThrow()
  })

  it('should handle the case of an empty project', () => {
    expect(() => selectActiveResources([])).not.toThrow()
  })
})
