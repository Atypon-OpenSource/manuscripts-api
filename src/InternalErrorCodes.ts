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
  SyncError = 1000,
  DiscourseError = 1001,
  NumericalError = 1002,
  BucketExistenceCheckError = 1003,
  NoBucketError = 1004,
  InvalidBucketError = 1005,
  DatabaseDesignDocumentInaccessibleError = 1006,
  GatewayInaccessibleError = 1007,
  NoDocumentMapperError = 1008,
  MissingQueryParameterError = 1009,
  MissingContainerError = 1010,
  ValidationError = 1011,
  InvalidBackchannelLogoutError = 1012,
  InvalidScopeNameError = 1013,
  UnexpectedUserStatusError = 1014,
  UnexpectedViewStateError = 1015,
  UserBlockedError = 1016,
  UserNotVerifiedError = 1017,
  UserRoleError = 1018,
  DatabaseDesignDocumentError = 1019,
  FunctionServiceLogicError = 1020,
  FunctionServiceRESTError = 1021,
  InvalidCredentialsError = 1022,
  MissingCookieError = 1023,
  MethodNotAllowedError = 1024,
  IAMIssuerError = 1025,
  InvalidServerCredentialsError = 1026,
  DuplicateEmailError = 1027,
  AccountNotFoundError = 1028,
  OperationDisabledError = 1029,
  RequestError = 1030,
  NoTokenError = 1031,
  InvalidClientApplicationError = 1032,
  InvalidJsonHeadersError = 1033,
  RecordGoneError = 1034,
  InvalidPasswordError = 1035,
  ForbiddenOriginError = 1036,
  InvalidClientApplicationStateError = 1037,
  ConfigurationError = 1038,
  RecordNotFoundError = 1039,
  EmailServiceError = 1040,
  IllegalStateError = 1041,
  DatabaseError = 1042,
  ConflictingRecordError = 1043,
  ConflictingUnverifiedUserExistsError = 1044,
  SecondaryIndexMissingError = 1045
}
