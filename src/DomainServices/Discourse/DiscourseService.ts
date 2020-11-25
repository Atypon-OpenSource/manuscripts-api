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

import * as HttpStatus from 'http-status-codes'
import request from 'request-promise-native'
import { createHmac } from 'crypto'
import DiscourseSSO from 'discourse-sso'
import { stringify } from 'querystring'

import { IdentifiableUser } from '../../Models/UserModels'
import { DiscourseUserDetails } from '../Auth/IAuthService'
import { DiscourseError, ValidationError } from '../../Errors'
import { LoginTokenPayload } from '../../Utilities/JWT/LoginTokenPayload'
import { DiscourseConfiguration } from '../../Config/ConfigurationTypes'

export interface DiscourseFeedbackPost {
  id: number,
  name: string,
  username: string,
  avatar_template: string,
  created_at: string,
  cooked: string,
  post_number: number,
  post_type: number,
  updated_at: string,
  reply_count: number,
  reply_to_post_number: number | null,
  quote_count: number,
  avg_time: null,
  incoming_link_count: number,
  reads: number,
  score: number,
  yours: boolean,
  topic_id: number,
  topic_slug: string,
  display_username: string,
  primary_group_name: string | null,
  primary_group_flair_url: string | null,
  primary_group_flair_bg_color: string | null,
  primary_group_flair_color: string | null,
  version: number,
  can_edit: boolean,
  can_delete: boolean,
  can_recover: boolean,
  can_wiki: boolean,
  user_title: string | null,
  moderator: boolean,
  admin: boolean,
  staff: boolean,
  user_id: number,
  draft_sequence: number,
  hidden: boolean,
  // hidden_reason_id: string | null, // unsure about type here?
  trust_level: number,
  deleted_at: string | null,
  user_deleted: true,
  edit_reason: string | null,
  can_view_edit_history: boolean,
  wiki: boolean
}
export class DiscourseService {
  constructor (readonly configuration: DiscourseConfiguration) {}

  public async getDiscourseUserID (user: IdentifiableUser): Promise<DiscourseUserDetails | null> {
    const reqURL = `${this.configuration.url}/users/by-external/${escape(user._id)}.json?api_key=${this.configuration.apiKey}&api_username=${this.configuration.adminUsername}`
    const options = {
      method: 'GET',
      uri: reqURL,
      json: true,
      resolveWithFullResponse: true,
      simple: false
    }

    const response = await request(options)
    if (response.statusCode === HttpStatus.OK) {
      if (!response.body || !response.body.user || !response.body.user) {
        throw new DiscourseError(`Unexpected response body from Discourse`, response.statusCode, response.body)
      }
      return response.body.user
    } else if (response.statusCode === HttpStatus.NOT_FOUND) {
      return null
    } else {
      throw new DiscourseError(`Failed to get Discourse user ID for '${user._id}'`, response.statusCode, response.body)
    }
  }

  /**
   * Attempts to ensure that a user matching the given user exists on the Discourse site this instance is linked to.
   * @param user The user for which a Discourse user should exist after this request.
   */
  public async ensureDiscourseUserExists (user: IdentifiableUser): Promise<DiscourseUserDetails> {
    const existingDiscourseUser = await this.getDiscourseUserID(user)
    if (existingDiscourseUser) {
      return existingDiscourseUser
    }

    const { sso, sig } = this.userSSOParameters(user) // nonce not used! if included, causes a 500!
    const reqURL = `${this.configuration.url}/admin/users/sync_sso?${stringify({ sso, sig })}&api_key=${this.configuration.apiKey}&api_username=system&${sso}&sig=${sig}`
    const options = {
      method: 'POST',
      uri: reqURL,
      resolveWithFullResponse: true,
      simple: false,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
    return this.syncUserDiscourseSSO(options)
  }

  private async syncUserDiscourseSSO (options: request.Options) {
    const response = await request(options)
    if (response.statusCode === HttpStatus.OK) {
      return JSON.parse(response.body)
    }
    throw new DiscourseError('Failed to create Discourse user', response.statusCode, response.body)
  }

  public discourseRedirectURL (discourseToken: string, discourseSig: string, authToken: LoginTokenPayload): string {
    const discourseSSO = new DiscourseSSO(this.configuration.ssoSecret)
    if (!discourseSSO.validate(discourseToken, discourseSig)) {
      throw new ValidationError(`Invalid signature for ${discourseToken} (${discourseSig})`, discourseSig)
    }

    const email = authToken.email
    if (!email) {
      throw new ValidationError('Missing property value "email" on auth token', authToken)
    }

    const nonce = discourseSSO.getNonce(discourseToken)

    const params = {
      nonce,
      email,
      external_id: authToken.userId,
      require_activation: false,
      suppress_welcome_message: true
    }

    const q = discourseSSO.buildLoginString(params)
    return `${this.configuration.url}/session/sso_login?${q}`
  }

  public async postFeedback (user: IdentifiableUser, title: string, body: string, messagePrivately: boolean): Promise<DiscourseFeedbackPost> {
    const discourseUser = await this.ensureDiscourseUserExists(user)

    if (!discourseUser) {
      throw new DiscourseError('Unexpectedly failed to recover Discourse user', 404, discourseUser)
    }

    const reqURL = `${this.configuration.url}/posts?api_key=${this.configuration.apiKey}&api_username=${discourseUser.username}`

    const response = await this.postFeedbackRequest(reqURL, title, body, messagePrivately)

    if (response.statusCode === HttpStatus.OK) {
      return JSON.parse(response.body) // TODO: Validate that this meets some basic expectations.
    } else {
      throw new DiscourseError(`Failed to get Discourse user ID for '${user._id}'`, response.statusCode, response.body)
    }
  }

  private userSSOParameters (user: IdentifiableUser) {
    const email = user.email
    if (!email) {
      throw new ValidationError(`User ${user} missing "email" field`, email)
    }

    // const nonce = cryptoRandomString(10)
    const params: any = {
      // nonce,
      email,
      username: email.split('@')[0],
      external_id: user._id,
      require_activation: false,
      suppress_welcome_message: true
    }

    const hmac = createHmac('sha256', this.configuration.ssoSecret)
    const payload = Buffer.from(stringify(params), 'utf8').toString('base64')
    hmac.update(payload)
    return { sso: payload, sig: hmac.digest('hex') }
  }

  private async postFeedbackRequest (uri: string, title: string, raw: string, messagePrivately: boolean) {
    const formData = {
      title,
      raw,
      category: this.configuration.feedbackCategoryID,
      target_usernames: messagePrivately ? this.configuration.adminUsername : undefined,
      archetype: messagePrivately ? 'private_message' : undefined
    }
    const options = {
      method: 'POST',
      uri,
      form: formData,
      resolveWithFullResponse: true
    }
    return request(options)
  }
}
