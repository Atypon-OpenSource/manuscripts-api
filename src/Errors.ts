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

import { InternalErrorCode } from './InternalErrorCodes'

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

export class MissingDocumentError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingDocumentError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Document '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingDocumentError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
export class MissingRecordError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingRecordError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Document '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingContainerError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class MissingSnapshotError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.MissingSnapshotError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.NOT_FOUND

  constructor(invalidValue: any) {
    super(`Snapshot '${invalidValue}' was not found.`)
    this.invalidValue = invalidValue
    this.name = 'MissingSnapshotError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class VersionMismatchError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.VersionMismatchError
  readonly invalidValue: any
  readonly statusCode = StatusCodes.CONFLICT

  constructor(invalidValue: any) {
    super(`Update denied, backend version is ${invalidValue}.`)
    this.invalidValue = invalidValue
    this.name = 'VersionMismatchError'
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

export class InvalidServerCredentialsError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.InvalidServerCredentialsError
  readonly statusCode = StatusCodes.UNAUTHORIZED
  constructor(message?: string) {
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

export class ForbiddenOriginError extends Error implements StatusCoded {
  readonly internalErrorCode = InternalErrorCode.ForbiddenOriginError
  readonly statusCode = StatusCodes.FORBIDDEN

  constructor(requestOrigin: string) {
    super(`'${requestOrigin}' not amongst allowed origins`)
    this.name = 'ForbiddenOriginError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
