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

export enum MessageType {
    AccountVerify = 'account-verify',
    AccountDeleted = 'account-deleted',
    AccountMarkedForDeletion = 'account-marked-for-deletion',
    PasswordReset = 'reset-password',
    Invitation = 'invitation',
    ProjectInvitation = 'project-invitation',
    ProjectInvitationAcceptance = 'invitation-acceptance',
    ProjectInvitationOwnerNotification = 'project-invitation-owner-notification',
    ContainerRequest = 'container-request',
    ContainerRequestAcceptance = 'container-request-acceptance',
    ContainerRequestRejection = 'container-request-rejection'
}

// caches templates eagerly upon access time.
export const templateNameForMessageType = (type: MessageType) => type
