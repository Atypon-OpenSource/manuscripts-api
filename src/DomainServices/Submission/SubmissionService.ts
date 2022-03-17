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

import { ISubmissionService } from './ISubmissionService'
import { ISubmissionRepository } from '../../DataAccess/Interfaces/ISubmissionRepository'
import { MissingSubmissionError, ValidationError } from '../../Errors'
import { SubmissionStatus } from '../../Models/SubmissionModels'
import { log } from '../../Utilities/Logger'

export class SubmissionService implements ISubmissionService {
  constructor(private submissionRepository: ISubmissionRepository) {}

  public async updateStatus(submissionId: string, status: string): Promise<void> {
    const submission = await this.submissionRepository.getById(submissionId)

    if (!submission) {
      throw new MissingSubmissionError(submissionId)
    }

    if (!(status in SubmissionStatus)) {
      throw new ValidationError('Invalid status recieved.', status)
    }

    if (status === SubmissionStatus.FAILURE || status === SubmissionStatus.PACKAGING_FAILURE) {
      log.info(`Submission ${submission._id} failed with status: ${status}`)
    }

    await this.submissionRepository.patch(submission._id, { status })
  }
}
