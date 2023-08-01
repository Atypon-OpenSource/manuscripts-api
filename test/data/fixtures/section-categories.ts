/*!
 * © 2023 Atypon Systems LLC
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
export const sectionCategories = [
  {
    _id: 'MPSectionCategory:abbreviations',
    name: 'Abbreviations',
    desc: 'List of abbreviations referred to in your manuscript.',
    objectType: 'MPSectionCategory',
    titles: ['List of abbreviations', 'Abbreviations'],
    singular: true,

    priority: 100,
    uniqueInScope: true,
  },
  {
    _id: 'MPSectionCategory:abstract',
    name: 'Abstract',
    desc: 'A short summary of your work.',
    objectType: 'MPSectionCategory',
    titles: ['abstract', 'summary', 'lead-in'],

    priority: 110,
    uniqueInScope: true,
    pageBreakStyle: 2,
    groupIDs: ['MPSectionCategory:abstracts'],
  },
]
