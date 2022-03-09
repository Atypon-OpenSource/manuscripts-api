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

export enum UserActivityEventType {
  DeleteAccount = 'DeleteAccount',
  EmailVerified = 'EmailVerified',
  Logout = 'Logout',
  RefreshSyncSession = 'RefreshSyncSession',
  Registration = 'Registration',
  ResetPassword = 'ResetPassword',
  SendPasswordResetEmail = 'SendPasswordResetEmail',
  SendInvitation = 'SendInvitation',
  StatusNotFound = 'StatusNotFound',
  SuccessfulLogin = 'SuccessfulLogin',
  RequestEmailVerification = 'RequestEmailVerification',
  ProjectCreated = 'ProjectCreated',
}

export interface UserActivityEvent {
  _id?: string
  userId: string
  createdAt: Date
  deviceId: string | null
  appId: string | null
  eventType: UserActivityEventType
}
