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

import { ManuscriptTemplate, SectionCategory } from '@manuscripts/transform'

import sectionCategories from '../../../data/section-categories/default-section-categories.json'

export const templates: ManuscriptTemplate[] = []

templates.push({
  title: 'Valid Template Title',
  _id: 'MPManuscriptTemplate:valid-template-1',
  sectionCategories: sectionCategories as SectionCategory[],
  bundle: '123',
})

templates.push({
  title: 'Valid Template Title',
  _id: 'MPManuscriptTemplate:valid-template-2',
  sectionCategories: sectionCategories as SectionCategory[],
  bundle: '123',
})
