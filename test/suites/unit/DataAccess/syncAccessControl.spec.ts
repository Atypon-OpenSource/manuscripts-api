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

import { syncAccessControl } from '../../../../src/DataAccess/syncAccessControl'
import { AccessControlRepository } from '../../../../src/DataAccess/AccessControlRepository'

beforeAll(async () => {
    AccessControlRepository.access = jest.fn()
    AccessControlRepository.channel = jest.fn()
    AccessControlRepository.getAccess = jest.fn(() => Promise.resolve([1]))
    AccessControlRepository.remove = jest.fn()
})

describe('sync access control', () => {
    test('random objects', async () => {
        await expect(syncAccessControl( { _deleted:true }, { _deleted:true })).rejects.toEqual({ forbidden: 'deleted document cannot be mutated' })
        await expect(syncAccessControl( {}, null)).rejects.toEqual({ forbidden: 'missing _id' })
        await expect(syncAccessControl( { objectType: 'foo', _id: 'bar' }, null)).rejects.toEqual({ forbidden: '_id must have objectType as prefix' })
    })

    test('Container creation', async () => {
        const types = ['MPProject', 'MPLibrary', 'MPLibraryCollection']
        for (const type of types) {
            const validObject = {
                createdAt: 231230131,
                updatedAt: 231230131,
                owners: ['User_ben@example.com'],
                writers: [],
                viewers: [],
                objectType: type,
                _id: type + ':foo',
            }

            const validObject2 = {
                createdAt: 231230131,
                updatedAt: 231230131,
                writers: ['User_ban@example.com'],
                viewers: [],
                objectType: type,
                _id: type + ':foo',
            }
            
            await expect(syncAccessControl({ ...validObject }, null, validObject.owners[0])).resolves
            await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'require user' })

            await expect(syncAccessControl({ ...validObject, owners: [] }, null, validObject.owners[0])).rejects.toEqual({ forbidden: 'owners cannot be set/updated to be empty' })
            await expect(syncAccessControl({ ...validObject, writers: ['User_ben@example.com'] }, null, validObject.owners[0]))
            .rejects.toEqual({ forbidden: 'duplicate userId:User_ben@example.com' })

            await expect(syncAccessControl({ ...validObject }, { ...validObject2 }, validObject.owners[0])).resolves
            await expect(syncAccessControl({ ...validObject }, { ...validObject2 })).rejects.toEqual({ forbidden: 'require user' })

            if (type !== 'MPProject') {
                await expect(syncAccessControl({ ...validObject, ...{ category: 'a' } },
                     { ...validObject })).rejects.toEqual({ forbidden: 'category cannot be mutated' })
            }
        }
    })

    test('MPUserProfile', async () => {
        const validObject = {
            createdAt: 231230131,
            updatedAt: 231230131,
            _id: 'MPUserProfile:foo',
            objectType: 'MPUserProfile',
            userID: 'User_mark@example.com',
            bibliographicName: {
              _id: 'MPBibliographicName:foo-bar',
              objectType: 'MPBibliographicName',
              given: 'Mark',
              family: 'Zuckerberg',
            },
            email: 'mark@example.com',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, validObject.userID)).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
    })

    test('MPPreferences', async () => {
        const validObject = {
            _id: 'MPPreferences:User_foo@bar.com',
            objectType: 'MPPreferences',
            nightMode: true,
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_foo@bar.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'require user' })
    })

    test('MPInvitation', async () => {
        const validObject = {
            _id: 'MPInvitation:5480f0bfe3b0f69beb8fe360adab156e06c614ff',
            invitingUserID: 'User_valid-user@manuscriptsapp.com',
            invitedUserEmail: 'valid-google@manuscriptsapp.com',
            invitedUserID: 'User_valid-google@manuscriptsapp.com',
            invitingUserProfile: {
              _id: 'MPUserProfile:foo',
              objectType: 'MPUserProfile',
              userID: 'User_mark@example.com',
              bibliographicName: {
                _id: 'MPBibliographicName:foo-bar',
                objectType: 'MPBibliographicName',
                given: 'Mark',
                family: 'Zuckerberg',
              },
              email: 'mark@example.com',
              createdAt: 231230131,
              updatedAt: 231230131,
            },
            message: 'Message',
            createdAt: 1522231220.927,
            updatedAt: 1522231220.927,
            objectType: 'MPInvitation',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_foo@bar.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).resolves
    })

    test('MPContainerInvitation', async () => {
        const validObject = {
            _id: 'MPContainerInvitation:5480f0bfe3b0f69beb8fe360adab156e06c614ff',
            invitingUserID: 'User_valid-user@manuscriptsapp.com',
            invitedUserEmail: 'valid-google@manuscriptsapp.com',
            invitedUserID: 'User_valid-google@manuscriptsapp.com',
            containerTitle: 'A* Algorithm',
            containerID: 'MPProject:this-is-sparta',
            invitedUserName: 'Kratos',
            invitingUserProfile: {
              _id: 'MPUserProfile:foo',
              objectType: 'MPUserProfile',
              userID: 'User_mark@example.com',
              bibliographicName: {
                _id: 'MPBibliographicName:foo-bar',
                objectType: 'MPBibliographicName',
                given: 'Mark',
                family: 'Zuckerberg',
              },
              email: 'mark@example.com',
              createdAt: 231230131,
              updatedAt: 231230131,
            },
            role: 'Owner',
            message: 'Message',
            createdAt: 1522231220.927,
            updatedAt: 1522231220.927,
            objectType: 'MPContainerInvitation',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_foo@bar.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).resolves
    })

    test('MPCollaboration', async () => {
        const validObject = {
            invitingUserID: 'User_bill@example.com',
            invitedUserID: 'User_ben@example.com',
            objectType: 'MPCollaboration',
            _id: 'MPCollaboration:foobarbaz',
            createdAt: 231230131,
            updatedAt: 231230131,
        }
        
        await expect(syncAccessControl({ ...validObject }, null, validObject.invitingUserID)).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'require user' })
        await expect(syncAccessControl({ ...validObject },
             { ...validObject, ...{createdAt: 11111} })).rejects.toEqual({ forbidden: 'MPCollaboration is immutable' })
    })

    test('Contained documents', async () => {
        const validObject = {
            updatedAt: 1515494608.245375,
            objectType: 'MPBorderStyle',
            _rev: '1-cf3758c6a77c031dcd8f617087c7493d',
            _id: 'MPBorderStyle:15326C7B-836D-4D6C-81EB-7E6CA6153E9A',
            containerID: 'MPProject:foo-bar-baz',
            manuscriptID: 'MPManuscript:zorb',
            title: 'Dotted',
            pattern: [1, 1],
            createdAt: 1515417692.476143,
            name: 'dotted',
            sessionID: '4D17753C-AF51-4262-9FBD-88D8EC7E8495',
            priority: 1,
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
    })

    test('MPContainerRequest', async () => {
        const validObject = {
            _id: 'MPContainerRequest:DF026E1B-394A-4A68-C761-9DB39349A714',
            objectType: 'MPContainerRequest',
            containerID: 'MPProject:990DC4B9-4AAE-4AEF-8630-04929F53B8EC',
            userID: 'User_foobar@manuscriptsapp.com',
            role: 'Writer',
            userProfile: {
              _id: 'MPUserProfile:foo-bar-baz',
              objectType: 'MPUserProfile',
              createdAt: 1515417692.477127,
              updatedAt: 1515494608.363229,
              bibliographicName: {
                _id: 'MPBibliographicName:foo-bar-baz',
                objectType: 'MPBibliographicName',
                createdAt: 1515417692.477127,
                updatedAt: 1515494608.363229,
              },
              userID: 'User_foobar@manuscriptsapp.com',
            },
            createdAt: 1454394584,
            updatedAt: 1454537867.959872,
        }
        
        
        await expect(syncAccessControl({ ...validObject }, null, validObject.userID)).resolves
    })

    test('MPCitationAlert', async () => {
        const validObject = {
            objectType: 'MPCitationAlert',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
            _rev: '1-cf3758c6a77c031dcd8f617087c7493d',
            _id: 'MPCitationAlert:15326C7B-836D-4D6C-81EB-7E6CA6153E9B',
            sessionID: '4D17753C-AF51-4262-9FBD-88D8EC7E8498',
            userID: 'User_foobar@manuscriptsapp.com',
            sourceDOI: '10.1007/978-981-13-0341-8_10',
            targetDOI: '10.1176/appi.psychotherapy.71101',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, validObject.userID)).resolves
        await expect(syncAccessControl({ ...validObject }, { ...validObject, isRead: true })).rejects.toEqual({ forbidden: 'require user' })
        await expect(syncAccessControl({ ...validObject }, { ...validObject, isRead: true }, validObject.userID)).resolves
    })

    test('MPMutedCitationAlert', async () => {
        const validObject = {
            objectType: 'MPMutedCitationAlert',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
            _rev: '1-cf3758c6a77c031dcd8f617087c7493d',
            _id: 'MPMutedCitationAlert:15326C7B-836D-4D6C-81EB-7E6CA6153E9B',
            sessionID: '4D17753C-AF51-4262-9FBD-88D8EC7E8498',
            userID: 'User_foobar@manuscriptsapp.com',
            targetDOI: '10.1176/appi.psychotherapy.71101',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, validObject.userID)).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'require user' })
    })

    test('MPBibliographyItem', async () => {
        const containerID = 'MPLibrary:1'

        const keywordIDs = ['MPLibraryCollection:a', 'MPLibraryCollection:b']


        const validObject = {
            _id: 'MPBibliographyItem:1',
            objectType: 'MPBibliographyItem',
            createdAt: 1571375482,
            updatedAt: 1571375482,
            containerID,
            keywordIDs,
            type: 'article',
            title: 'Test Article',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
    })

    test('MPCommentAnnotation', async () => {
        const validObject = {
            _id: 'MPCommentAnnotation:foobar',
            objectType: 'MPCommentAnnotation',
            containerID: 'MPProject:foobarbaz',
            contents: '',
            target: '',
            manuscriptID: 'MPManuscript:foobarbaz',
            contributions: [
            {
                _id: 'MPContribution:foobarbaz',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz',
                timestamp: 1515494608.363229,
            },
            ],
            sessionID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
        
        let invalidObject = Object.assign({}, validObject, {
            contributions: [
              ...validObject.contributions,
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ],
        })
        await expect(syncAccessControl({ ...invalidObject }, null)).rejects.toEqual({ forbidden: 'Only one contribution allowed' })

        invalidObject = Object.assign({}, validObject, {
            contributions: [
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ]
        })
        await expect(syncAccessControl({ ...invalidObject }, { ...validObject })).rejects.toEqual({ forbidden: 'contributions cannot be mutated' })
    
        await expect(syncAccessControl(Object.assign({}, validObject, { resolved: true }),
        Object.assign({}, validObject), 'User_bill@example.com')).resolves

        await expect(syncAccessControl(Object.assign({}, validObject, { 
            readBy: ['MPUserProfile:foobarbaz2344']
        }),
        Object.assign({}, validObject), 'User_bill@example.com')).rejects.toEqual({ forbidden: 'User can set status "read" only for himself and cannot unset it' })
    
        await expect(syncAccessControl(Object.assign({}, validObject, { 
            readBy: ['MPUserProfile:foobarbaz']
        }),
        Object.assign({}, validObject), 'User_bill@example.com')).resolves
    
    })

    test('MPManuscriptNote', async () => {
        const validObject = {
            _id: 'MPManuscriptNote:foobar',
            objectType: 'MPManuscriptNote',
            containerID: 'MPProject:foobarbaz',
            contents: '',
            target: '',
            manuscriptID: 'MPManuscript:foobarbaz',
            contributions: [
            {
                _id: 'MPContribution:foobarbaz',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz',
                timestamp: 1515494608.363229,
            },
            ],
            sessionID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
            source: 'EMAIL',
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
        
        let invalidObject = Object.assign({}, validObject, {
            contributions: [
              ...validObject.contributions,
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ],
        })
        await expect(syncAccessControl({ ...invalidObject }, null)).rejects.toEqual({ forbidden: 'Only one contribution allowed' })

        invalidObject = Object.assign({}, validObject, {
            contributions: [
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ]
        })
        await expect(syncAccessControl({ ...invalidObject }, { ...validObject })).rejects.toEqual({ forbidden: 'contributions cannot be mutated' })
    
        await expect(syncAccessControl(Object.assign({}, validObject, { resolved: true }),
        Object.assign({}, validObject), 'User_bill@example.com')).resolves
    })

    test('MPCorrection', async () => {
        const validObject = {
            _id: 'MPCorrection:foobar',
            objectType: 'MPCorrection',
            containerID: 'MPProject:foobarbaz',
            manuscriptID: 'MPManuscript:foobarbaz',
            contributions: [
            {
                _id: 'MPContribution:foobarbaz',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz',
                timestamp: 1515494608.363229,
            },
            ],
            sessionID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            snapshotID: 'MPSnapshot:40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            commitChangeID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
            status: { label: 'proposed', editorProfileID: 'MPUserProfile:foobarbaz' },
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
        
        let invalidObject = Object.assign({}, validObject, {
            contributions: [
              ...validObject.contributions,
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ],
        })
        await expect(syncAccessControl({ ...invalidObject }, null)).rejects.toEqual({ forbidden: 'Only one contribution allowed' })

        invalidObject = Object.assign({}, validObject, {
            contributions: [
              {
                _id: 'MPContribution:foobarbaz2',
                objectType: 'MPContribution',
                profileID: 'MPUserProfile:foobarbaz2',
                timestamp: 1515494608.363229,
              },
            ]
        })
        await expect(syncAccessControl({ ...invalidObject }, { ...validObject })).rejects.toEqual({ forbidden: 'contributions cannot be mutated' })
    
        await expect(syncAccessControl(Object.assign({}, validObject, { resolved: true }),
        Object.assign({}, validObject), 'User_bill@example.com')).resolves

        await expect(syncAccessControl(Object.assign({}, validObject, { 
            status: {
                label: 'accepted',
                editorProfileID: 'MPUserProfile:foobarbaz2',
            },
        }),
        Object.assign({}, validObject), 'User_bill@example.com')).resolves
    })

    test('MPCommit', async () => {
        const validObject = {
            _id: 'MPCommit:foobar',
            objectType: 'MPCommit',
            containerID: 'MPProject:foobarbaz',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,
            blame: [
              {
                from: 1,
                to: 2,
                commit: 'Some message',
              },
            ],
            steps: [],
            changeID: 'random',        
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
        await expect(syncAccessControl({ ...validObject }, { ...validObject }, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, { ...validObject, ...{ changeId: 'a' }}, 'User_bill@example.com')).resolves
    })

    test('MPManuscript', async () => {
        const validObject = {
            _id: 'MPManuscript:foobar',
            objectType: 'MPManuscript',
            containerID: 'MPProject:foobarbaz',
            sessionID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,       
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
    })

    test('MPContributor', async () => {
        const validObject = {
            _id: 'MPContributor:foobar',
            objectType: 'MPContributor',
            containerID: 'MPProject:foobarbaz',
            manuscriptID: 'MPManuscript:foobar',
            bibliographicName: {
              _id: 'MPBibliographicName:foobar',
              objectType: 'MPBibliographicName',
            },
            sessionID: '40dc16f1-adbd-4410-af1c-2eddd6bfa63e',
            createdAt: 1515417692.477127,
            updatedAt: 1515494608.363229,               
        }
        
        await expect(syncAccessControl({ ...validObject }, null, 'User_bill@example.com')).resolves
        await expect(syncAccessControl({ ...validObject }, null)).rejects.toEqual({ forbidden: 'user does not have access' })
    })
})