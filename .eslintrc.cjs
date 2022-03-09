/*!
 * © 2022 Atypon Systems LLC
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

module.exports = {
    //parser: '@typescript-eslint/parser',
    extends: '@manuscripts/eslint-config',
    rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        'import/no-named-as-default': 'off',
        'import/no-named-as-default-member': 'off',
        'simple-import-sort/sort': 'off',
        'promise/always-return': 'off',
        'promise/no-nesting': 'off',
        'promise/no-promise-in-callback': 'off',
        'promise/no-return-wrap': 'off',
        'prefer-const': 'off',
        'import/no-unresolved': 'off',
        'no-useless-escape': 'off',
        'promise/catch-or-return': 'off'
    },
}