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

 import { LibraryLike } from '../../../src/DataAccess/Interfaces/Models'	

 export const validLibrary: LibraryLike = {	
   _id: 'MPLibrary:valid-library-id',	
   objectType: 'MPLibrary',	
   owners: ['User_test'],	
   writers: [],	
   viewers: []	
 }	
 
 export const validLibraryRequest: LibraryLike = {	
   _id: 'MPLibrary:valid-library-id-request',	
   objectType: 'MPLibrary',	
   owners: ['User_valid-user@manuscriptsapp.com'],	
   writers: [],	
   viewers: ['User_valid-user-3@manuscriptsapp.com']	
 }	
 
 export const validLibrary6: LibraryLike = {	
   _id: 'valid-library-id-6',	
   objectType: 'MPLibrary',	
   owners: ['User_test'],	
   writers: [],	
   viewers: []	
 }	
 
 export const validLibrary2: LibraryLike = {	
   _id: 'MPLibrary:valid-library-id-2',	
   objectType: 'MPLibrary',	
   owners: ['User_test', 'User_valid-user-1@manuscriptsapp.com'],	
   writers: [],	
   viewers: []	
 }	
 
 export const validLibrary3: LibraryLike = {	
   _id: 'MPLibrary:valid-library-id-3',	
   objectType: 'MPLibrary',	
   owners: ['User_foo@bar.com'],	
   writers: [],	
   viewers: []	
 }	
 
 export const validLibrary4: LibraryLike = {	
   _id: 'valid-library-id-4',	
   objectType: 'MPLibrary',	
   owners: ['User_valid-user-1@manuscriptsapp.com'],	
   writers: ['User_test', 'User_test10'],	
   viewers: ['User_test2']	
 }	
 
 export const validLibrary5: LibraryLike = {	
   _id: 'valid-library-id-5',	
   objectType: 'MPLibrary',	
   owners: ['User_valid-user-1@manuscriptsapp.com'],	
   writers: [],	
   viewers: ['User_valid-user@manuscriptsapp.com']	
 }	
 
 export const validLibraryNotInDB: LibraryLike = {	
   _id: 'valid-library-not-in-db',	
   objectType: 'MPLibrary',	
   owners: ['User_test'],	
   writers: [],	
   viewers: []	
 }	
 
 export const validLibraryForRemoveTest: LibraryLike = {	
   _id: 'valid-library-for-remove-test',	
   objectType: 'MPLibrary',	
   owners: ['User_test'],	
   writers: [],	
   viewers: []	
 }	
 
 export const invalidTypeLibrary = {	
   objectType: 'MPAnything',	
   _id: 'valid-id-2'	
 }	
 
 export const validLibrary7: LibraryLike = {	
   _id: 'valid-library-id-7',	
   objectType: 'MPLibrary',	
   owners: ['User_valid-user-1@manuscriptsapp.com'],	
   writers: ['User_test', 'User_test10'],	
   viewers: ['User_test2', '*']	
 }	
 