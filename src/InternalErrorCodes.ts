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

export enum InternalErrorCode {
  SyncError = 'SG_ERR',
  DiscourseError = 'DISCOURSE_ERR',
  NumericalError = 'NUMERICAL_ERR',
  BucketExistenceCheckError = 'CB_BUCKET_EXISTANCE_CHECK_FAIL',
  NoBucketError = 'CB_BUCKET_NOT_FOUND',
  InvalidBucketError = 'CB_INVALID_BUCKET',
  DatabaseDesignDocumentInaccessibleError = 'DB_DESIGN_DOC_INACCESSIBLE',
  GatewayInaccessibleError = 'SG_INACCESSIBLE',
  NoDocumentMapperError = 'NO_DOCUMENT_MAPPER',
  MissingQueryParameterError = 'QUERY_PARAM_NOT_FOUND',
  MissingContainerError = 'CONTAINER_NOT_FOUND',
  MissingProductionNoteError = 'PN_NOTES_NOT_FOUND',
  MissingUserRecordError = 'USER_RECORD_NOT_FOUND',
  MissingTemplateError = 'TEMPLATE_NOT_FOUND',
  MissingSubmissionError = 'SUBMISSION_NOT_FOUND',
  ValidationError = 'VALIDATION_ERR',
  InvalidBackchannelLogoutError = 'BACKCHANNEL_LOGOUT_FAIL',
  InvalidScopeNameError = 'SCOPE_INVALID',
  MissingUserStatusError = 'USER_STATUS_NOT_FOUND',
  UnexpectedViewStateError = 'UNEXPECTED_VIEW_STATE',
  UserBlockedError = 'ACCT_BLOCKED',
  UserNotVerifiedError = 'ACCT_NOT_VERIFIED',
  UserRoleError = 'USER_ROLE_ERR',
  RoleDoesNotPermitOperationError = 'OP_NOT_PERMITTED',
  DatabaseDesignDocumentError = 'DB_DESIGN_DOC_ERR',
  FunctionServiceLogicError = 'FUNC_SER_LOGIC_ERR',
  FunctionServiceRESTError = 'FUNC_SER_REST_ERR',
  InvalidCredentialsError = 'INV_CREDENTIALS',
  MissingCookieError = 'COOKIE_NOT_FOUND',
  MethodNotAllowedError = 'METHOD_NOT_ALLOWED',
  IAMIssuerError = 'IAM_ISSUER_ERR',
  InvalidServerCredentialsError = 'INV_SERVER_CREDS',
  DuplicateEmailError = 'DUPLICATE_EMAIL',
  AccountNotFoundError = 'ACCT_NOT_FOUND',
  OperationDisabledError = 'OP_DISABLED',
  RequestError = 'REQUEST_ERR',
  NoTokenError = 'TOKEN_NOT_FOUND',
  InvalidClientApplicationError = 'INV_CLIENT_APP',
  InvalidJsonHeadersError = 'INV_JSON_HEADERS',
  RecordGoneError = 'RECORD_GONE',
  InvalidPasswordError = 'INV_PASSWORD',
  ForbiddenOriginError = 'FORBIDDEN_ORIGIN',
  InvalidClientApplicationStateError = 'INV_CLIENT_APP_STATE',
  ConfigurationError = 'CONF_ERR',
  RecordNotFoundError = 'RECORD_NOT_FOUND',
  EmailServiceError = 'EMAIL_SER_FAIL',
  IllegalStateError = 'ILLIGAL_STATE_ERR',
  DatabaseError = 'DB_ERR',
  ConflictingRecordError = 'RECORD_ALREADY_EXISTS',
  ConflictingUnverifiedUserExistsError = 'UNVERIFIED_USER_EXISTS',
  SecondaryIndexMissingError = 'SEC_IDX_NOT_FOUND',
  ProductionNotesUpdateError = 'PN_NOTES_NOT_UPDATED',
  ProductionNotesLoadError = 'PN_NOTES_NOT_LOADED',
  ManuscriptContentParsingError = 'MANUSCRIPT_CONTENT_PARSING_FAILED'
}
