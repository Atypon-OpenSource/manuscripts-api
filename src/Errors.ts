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

import { Prisma } from '@prisma/client'
import { StatusCodes } from 'http-status-codes'

import { BucketKey } from './Config/ConfigurationTypes'
import { InternalErrorCode } from './InternalErrorCodes'
import { User, UserStatus } from './Models/UserModels'
import { isString } from './util'

/** An error-like object that has a code. Used amongst error types to describe those error types that have their own natural HTTP status code. */
export interface StatusCoded {
  readonly statusCode: number
  readonly name: string
  readonly message: string
  readonly internalErrorCode: InternalErrorCode
}

export function isStatusCoded(err: Error): err is StatusCoded {
  const statusCode = (err as any).statusCode
  if (typeof statusCode !== 'number') {
    return false
  }

  // we could be stricter, but let's assume
  // 4xx and 5xx are HTTP status code -like enough.
  return statusCode >= 400 && statusCode <= 599
}

/**
 * Represents a sync error.
 */
export class SyncError extends Error implements StatusCoded {
  readonly syncGatewayResponseBody: any
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  readonly internalErrorCode = InternalErrorCode.SyncError

  constructor(message: string, responseBody: any) {
    super(
      message +
        ` (body: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)})`
    )
    this.name = 'SyncError'
    this.syncGatewayResponseBody = responseBody
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** An error that is only communicated to our system as a code.
 *  You should not use this type unless you only have a number to work with as a description of an error.
 * Does *not* implement StatusCoded, as an arbitrary error code does not map naturally to acceptable HTTP statuses.
 */
export class NumericalError extends Error {
  readonly internalErrorCode = InternalErrorCode.NumericalError
  constructor(readonly code: number) {
    super()
    this.name = 'NumericalError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Represents a database error.
 */
export class DatabaseError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.DatabaseError
  // code = HTTP status code
  // underlyingCode = the error code the backend API returned.
  // underlyingError = the error the backend API returned.
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(
    readonly underlyingCode: string | undefined,
    message: string,
    readonly value: any,
    readonly underlyingError: Error
  ) {
    super(
      `SQLDatabase error with code ${underlyingCode}: ${message}\nUnderlying error: ${underlyingError}`
    )
    this.name = 'DatabaseError'
  }

  static fromPrismaError(
    underlyingError: Prisma.PrismaClientKnownRequestError,
    message: string,
    value: any
  ) {
    return new DatabaseError(
      underlyingError.code,
      `SQLDatabase error with code ${underlyingError.code} occurred: ${message}`,
      value,
      underlyingError
    )
  }
}

export class NoBucketError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.NoBucketError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(message?: string) {
    super(
      isString(message) ? message : `SQLDatabase has no bucket. Bucket has not been yet opened?`
    )
    this.name = 'NoBucketError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidBucketError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidBucketError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(bucketKey: BucketKey) {
    super(`No bucket for key '${bucketKey}'`)
    this.name = 'InvalidBucketError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ProductionNotesUpdateError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ProductionNotesUpdateError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor() {
    super('Failed to create/update production note.')
    this.name = 'ProductionNotesUpdateError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ProductionNotesLoadError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ProductionNotesLoadError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor() {
    super('Failed to retrieve production note.')
    this.name = 'ProductionNotesLoadError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingQueryParameterError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingQueryParameterError
  readonly queryParamKey: string
  readonly statusCode = StatusCodes.BAD_REQUEST

  constructor(queryParamKey: any) {
    super(`Missing query parameter key: ${queryParamKey}`)
    this.queryParamKey = queryParamKey
    this.name = 'MissingQueryParameterError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingContainerError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingContainerError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Container '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingContainerError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingManuscriptError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingManuscriptError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Manuscript '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingManuscriptError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingModelError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingModelError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Model '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingModelError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingProductionNoteError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingProductionNoteError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Manuscript note with ID '${invalidValue}' not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingProductionNoteError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingUserRecordError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingUserRecordError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`User record '${invalidValue}' is not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingUserRecordError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingTemplateError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingTemplateError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Template '${invalidValue}' is not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingTemplateError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ValidationError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.BAD_REQUEST

  constructor(message: string, invalidValue: any) {
    super(`Validation error: ${message}`)
    this.invalidValue = invalidValue
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidBackchannelLogoutError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidBackchannelLogoutError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.BAD_REQUEST

  constructor(message: string, invalidValue: any) {
    super(`Invalid backchannel logout error: ${message}`)
    this.invalidValue = invalidValue
    this.name = 'InvalidBackchannelLogoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidScopeNameError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidScopeNameError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.BAD_REQUEST

  constructor(invalidValue: any) {
    super(`The scope '${invalidValue}' is invalid.`)
    this.invalidValue = invalidValue
    this.name = 'InvalidScopeNameError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingUserStatusError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingUserStatusError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  readonly user: User
  constructor(userID: string) {
    super(`User status for user '${userID}' is not found.`)
    this.name = 'MissingUserStatusError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UserBlockedError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.UserBlockedError
  readonly statusCode = StatusCodes.FORBIDDEN
  readonly user: User
  readonly userStatus: UserStatus
  constructor(user: User, userStatus: UserStatus) {
    super(`User '${user._id}' account is blocked.`)
    this.user = user
    this.userStatus = userStatus
    this.name = 'UserBlockedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UserNotVerifiedError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.UserNotVerifiedError
  readonly statusCode = StatusCodes.FORBIDDEN
  readonly user: User
  readonly userStatus: UserStatus
  constructor(user: User, userStatus: UserStatus) {
    super(`User '${user._id}' account is not verified.`)
    this.user = user
    this.userStatus = userStatus
    this.name = 'UserNotVerifiedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class UserRoleError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.UserRoleError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.FORBIDDEN

  constructor(message: string, invalidValue: any) {
    super(message)
    this.invalidValue = invalidValue
    this.name = 'UserRoleError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RoleDoesNotPermitOperationError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.RoleDoesNotPermitOperationError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.UNAUTHORIZED

  constructor(message: string, invalidValue: any) {
    super(message)
    this.invalidValue = invalidValue
    this.name = 'RoleDoesNotPermitOperationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidCredentialsError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidCredentialsError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCredentialsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingCookieError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingCookieError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor() {
    super('Cookie header is missing.')
    this.name = 'MissingCookieError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class IAMIssuerError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.IAMIssuerError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  constructor(readonly underlyingError?: Error) {
    super(`Error retrieving issuer from IAM server: ${underlyingError}.`)
    this.name = 'IAMIssuerError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidServerCredentialsError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidServerCredentialsError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor(message: string) {
    super(message)
    this.name = 'InvalidServerCredentialsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class DuplicateEmailError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.DuplicateEmailError
  readonly statusCode = StatusCodes.CONFLICT
  constructor(email: string) {
    super(`Email '${email}' is not available.`)
    this.name = 'DuplicateEmailError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AccountNotFoundError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.AccountNotFoundError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor(credentials: string | undefined) {
    super(`User '${credentials}' is not found.`)
    this.name = 'AccountNotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class OperationDisabledError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.OperationDisabledError
  readonly statusCode = StatusCodes.SERVICE_UNAVAILABLE
  constructor(message: string) {
    super(message)
    this.name = 'OperationDisabledError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NoTokenError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.NoTokenError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  readonly ID: string
  constructor(ID: string) {
    super(`Token does not exist in the database for ID '${ID}'`)
    this.ID = ID
    this.name = 'NoTokenError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidClientApplicationError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidClientApplicationError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor(appID: string | string[] | undefined, deviceID?: string) {
    super(`Invalid application ID ${appID} (device ID: ${deviceID})`)
    this.name = 'InvalidClientApplicationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidJsonHeadersError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidJsonHeadersError
  readonly statusCode = StatusCodes.BAD_REQUEST
  constructor(acceptHeader: string | string[] | undefined) {
    super(`Invalid accept header ${acceptHeader}`)
    this.name = 'InvalidJsonHeadersError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RecordNotFoundError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.RecordNotFoundError
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(message: string) {
    super(message)
    this.name = 'RecordNotFoundError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingSubmissionError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingSubmissionError
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(submissionID: string) {
    super(`Submission '${submissionID}' is not found.`)
    this.name = 'MissingSubmissionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class EmailServiceError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.EmailServiceError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(email: string, readonly underlyingError: Error | null) {
    super(`Error occurred while sending email: ${email}`)
    this.name = 'EmailServiceError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class IllegalStateError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.IllegalStateError
  readonly illegalState: any
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(message: string, illegalState: any) {
    super(`Program is in illegal state: ${message} (state: ${JSON.stringify(illegalState)})`)
    this.illegalState = illegalState
    this.name = 'IllegalStateError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ConflictingRecordError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ConflictingRecordError
  readonly existingValue: any
  readonly statusCode = StatusCodes.CONFLICT

  constructor(message: string, existingValue: any) {
    super(`Conflict error: ${message}`)
    this.existingValue = existingValue
    this.name = 'ConflictingRecordError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ConflictingUnverifiedUserExistsError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ConflictingUnverifiedUserExistsError
  readonly existingValue: any
  readonly statusCode = StatusCodes.CONFLICT

  constructor(existingValue: any) {
    super(`User '${existingValue}' already exists but not verified.`)
    this.existingValue = existingValue
    this.name = 'ConflictingUnverifiedUserExistsError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MethodNotAllowedError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MethodNotAllowedError
  readonly methodName: string
  readonly className: string
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(className: string, methodName: string) {
    super(`Method '${methodName}' not allowed in '${className}'`)
    this.methodName = methodName
    this.className = className
    this.name = 'MethodNotAllowedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ConfigurationError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ConfigurationError
  readonly key: string
  readonly value: any
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(key: string, value: any) {
    super(
      `Configuration value for key '${key}' unexpectedly missing, empty, or not a string: '${value}'`
    )
    this.key = key
    this.value = value
    this.name = 'ConfigurationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ForbiddenOriginError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ForbiddenOriginError
  readonly statusCode = StatusCodes.FORBIDDEN

  constructor(requestOrigin: string) {
    super(`'${requestOrigin}' not amongst allowed origins`)
    this.name = 'ForbiddenOriginError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InvalidPasswordError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidPasswordError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  readonly user: User
  constructor(user: User) {
    super(`Password does not match for user '${user.email}'`)
    this.user = user
    this.name = 'InvalidPasswordError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ManuscriptContentParsingError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ManuscriptContentParsingError
  readonly statusCode = StatusCodes.FORBIDDEN
  constructor(message: string, readonly underlyingError: Error) {
    super(`${message} (Underlying error = ${underlyingError})`)
    this.name = 'ManuscriptContentParsingError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RecordGoneError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.RecordGoneError
  readonly statusCode = StatusCodes.GONE

  constructor(message: string) {
    super(message)
    this.name = 'RecordGoneError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RequestError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.RequestError
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR

  constructor(message: string) {
    super(message)
    this.name = 'RequestError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
