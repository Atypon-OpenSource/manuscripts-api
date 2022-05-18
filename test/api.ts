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

import supertest from 'supertest'

import { createServer } from './utilities/server'
import { IServer } from '../src/Server/IServer'
import { getContainerType } from '../src/Controller/ContainedBaseController'

// Auth

export async function basicLogin(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/login').set(headers).send(body)
}

export async function serverToServerAuth(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/admin').set(headers).send(body)
}

export async function serverToServerTokenAuth(
  body: any,
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app)
    .post(`/api/v1/auth/token/${params.connectUserID}`)
    .set(headers)
    .send(body)
}

export async function connectSignup(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/registration/connect/signup').set(headers).send(body)
}

export async function googleLogin(headers: any, query: any): Promise<supertest.Response> {
  const server = await createServer()

  return supertest(server.app).get('/api/v1/auth/google').query(query).set(headers).send()
}

export async function googleLoginCallback(query?: any): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).get('/api/v1/auth/google/callback').query(query).send()
}

export async function logout(headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/logout').set(headers).send()
}

export async function backchannelLogout(
  headers: object,
  query: object
): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app)
    .post('/api/v1/auth/backchannel_logout')
    .query(query)
    .set(headers)
    .send()
}

export async function forgotPassword(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/sendForgottenPassword').set(headers).send(body)
}

export async function resetPassword(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/resetPassword').set(headers).send(body)
}

export async function changePassword(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/auth/changePassword').set(headers).send(body)
}

export async function iamOAuthStart(headers: object, query: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get('/api/v1/auth/iam').set(headers).query(query).send()
}

export async function iamOAuthCallback(query: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get('/api/v1/auth/iam/callback').query(query).set(headers).send()
}

export async function authorizationToken(
  headers: Object,
  params: any
): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).get(`/api/v1/authorization/${params.scope}`).set(headers).send()
}

// Containers Invitation

export async function accept(body: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/invitation/accept').set(headers).send(body)
}

export async function reject(body: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/invitation/reject').set(headers).send(body)
}

export async function uninvite(body: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).delete('/api/v1/invitation').set(headers).send(body)
}

export async function acceptInvitationToken(
  body: any,
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/invitation/${params.containerType}/access`)
    .set(headers)
    .send(body)
}

export async function requestInvitationToken(
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/invitation/${params.containerID}/${params.role}`)
    .set(headers)
    .send()
}

export async function refreshInvitationToken(
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/invitation/${params.containerID}/${params.role}`)
    .set(headers)
    .send()
}

export async function invite(body: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/invitation/invite').set(headers).send(body)
}

export async function inviteToContainer(
  body: any,
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/invitation/${params.containerID}/invite`)
    .set(headers)
    .send(body)
}

// Registration

export async function signup(body: any, headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/registration/signup').set(headers).send(body)
}

export async function verify(body?: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/registration/verify').send(body)
}

export async function requestVerificationEmail(
  body: object,
  headers: object
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/registration/verify/resend`).set(headers).send(body)
}

// User

export async function markUserForDeletion(
  headers: object,
  body?: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/user/mark-for-deletion').set(headers).send(body)
}

export async function unmarkUserForDeletion(headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post('/api/v1/user/unmark-for-deletion').set(headers)
}

export async function getProfile(headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get('/api/v1/user').set(headers)
}

export async function userContainers(headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get(`/api/v1/user/projects`).set(headers).send()
}

// Server status

export async function getAppVersion(_headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get('/api/v1/app/version')
}

export async function getRoot(_headers: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get('/')
}

// Not found

export async function notFound(body: any, headers: object): Promise<supertest.Response> {
  const server = await createServer()
  return supertest(server.app).post('/api/v1/not/found').set(headers).send(body)
}

// Container

export async function create(headers: object, body: any, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/container/${params.containerType}/create`)
    .set(headers)
    .send(body)
}

export async function deleteContainer(headers: object, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).delete(`/api/v1/container/${params.containerID}`).set(headers).send()
}

export async function manageUserRole(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/container/${params.containerID}/roles`).set(headers).send(body)
}

export async function addUser(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/container/${params.containerID}/addUser`).set(headers).send(body)
}

export async function getArchive(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(
      params.manuscriptID
        ? `/api/v1/container/${params.containerID}/${params.manuscriptID}/archive`
        : `/api/v1/container/${params.containerID}/archive`
    )
    .set(headers)
    .send(body)
}

export async function loadProject(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(
      params.manuscriptId
        ? `/api/v1/container/${params.projectId}/${params.manuscriptId}/load`
        : `/api/v1/container/${params.projectId}/load`
    )
    .set(headers)
    .send(body)
}

export async function getAttachment(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/container/${params.containerType}/attachment/${params.id}`)
    .set(headers)
    .send(body)
}

export async function accessToken(headers: object, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/container/${getContainerType(params.containerID)}/${params.containerID}/${params.scope}`)
    .set(headers)
    .send()
}

export async function pickerBundle(headers: object, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/container/picker-bundle/${params.containerID}/${params.manuscriptID}`)
    .set(headers)
    .send()
}

export async function createManuscript(
  headers: object,
  params: any,
  body?: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(
      `/api/v1/container/projects/${params.containerID}/manuscripts/${
        params.manuscriptID ? params.manuscriptID : ''
      }`
    )
    .set(headers)
    .send(body)
}

export async function getProductionNotes(
  headers: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/container/projects/${params.containerID}/manuscripts/${params.manuscriptID}/notes`)
    .set(headers)
    .send()
}

export async function addProductionNote(
  headers: object,
  params: any,
  body: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  const url = `/api/v1/container/projects/${params.containerID}/manuscripts/${params.manuscriptID}/notes`
  return supertest(server.app).post(url).set(headers).send(body)
}
// Container Request

export async function createContainerRequest(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/request/${params.containerID}/create`)
    .set(headers)
    .send(body)
}

export async function acceptContainerRequest(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/request/${params.containerID}/accept`)
    .set(headers)
    .send(body)
}

export async function rejectContainerRequest(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/request/${params.containerID}/reject`)
    .set(headers)
    .send(body)
}

// Submission

export async function updateStatus(
  headers: object,
  body: object,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/submission/status/${params.id}`)
    .set(headers)
    .send(body)
}

export async function fetchTemplates(): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get(`/api/v1/publishedTemplates`)
}

// Project

export async function createProject(headers: any, body: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/project/`).set(headers).send(body)
}

export async function submitExternalFiles(headers: any, body: object): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/container/external-files/submit`).set(headers).send(body)
}

export async function createSnapshot(
  headers: any,
  params: any,
  body: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .post(`/api/v1/container/snapshot/${params.containerID}/create`)
    .set(headers)
    .send(body)
}

export async function getCorrectionStatus(headers: any, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/container/projects/${params.containerID}/suggestions/status`)
    .set(headers)
}

export async function saveProject(
  headers: object,
  params: any,
  body: object
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  const req = supertest(server.app).post(`/api/v1/project/${params.containerID}/save`).set(headers)
  return req.send(body)
}

export async function getCollaborators(
  headers: object,
  params: any,
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).get(`/api/v1/project/${params.containerID}/collaborators`).set(headers)
}

export async function importManuscript(
  headers: object,
  params: any,
  filePath: string,
  manuscriptId?: string,
  templateId?: string
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  const req = supertest(server.app).post(`/api/v1/project/${params.containerID}`).set(headers)
  if (manuscriptId) {
    req.field('manuscriptId', manuscriptId)
  }
  if (templateId) {
    req.field('templateId', templateId)
  }
  return req.attach('file', filePath)
}

export async function SGCreate(
  headers: object,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app).post(`/api/v1/sg/${params.db}`).set(headers).send(body)
}

export async function SGGet(headers: object, query: any, params: any): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .get(`/api/v1/sg/${params.db}/${params.id}`)
    .query(query)
    .set(headers)
    .send()
}

export async function SGDelete(
  headers: object,
  query: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .delete(`/api/v1/sg/${params.db}/${params.id}`)
    .query(query)
    .set(headers)
    .send()
}

export async function SGUpdate(
  headers: object,
  query: any,
  body: any,
  params: any
): Promise<supertest.Response> {
  const server: IServer = await createServer()
  return supertest(server.app)
    .put(`/api/v1/sg/${params.db}/${params.id}`)
    .query(query)
    .set(headers)
    .send(body)
}
