/*!
 * © 2023 Atypon Systems LLC
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
import { promises as fs } from 'fs'
import client from 'prom-client'
import { parse, SemVer } from 'semver'

import { ServerStatus } from '../Controller/V2/ServerStatus/ServerStatus'

const appMetricMap = {
  name: 'app_version',
  packageName: 'app_version',
  help: 'The service version by package.json',
  labelNames: ['version', 'major', 'minor', 'patch'],
}
const metricsMap = [
  {
    name: 'json_schema_version_info',
    packageName: 'json-schema',
    help: 'The @manuscripts/json-schema version by package.json',
    labelNames: ['version', 'major', 'minor', 'patch'],
  },
]

function register(
  metric: { help: string; labelNames: string[]; name: string; packageName: string },
  semver: SemVer
) {
  if (!client.register.getSingleMetric(metric.name)) {
    const gauge = new client.Gauge({
      name: metric.name,
      help: metric.help,
      labelNames: metric.labelNames,
    })
    gauge.labels(semver.version, `${semver.major}`, `${semver.minor}`, `${semver.patch}`).set(1)
  }
}

export async function configurePromClientRegistry(): Promise<void> {
  const appVersion: SemVer | null = parse(ServerStatus.version, {})
  if (appVersion) {
    register(appMetricMap, appVersion)
  }
  for (const metric of metricsMap) {
    const semver = await getVersion(metric.packageName)
    if (semver) {
      register(metric, semver)
    }
  }
}

async function getVersion(packageName: string): Promise<SemVer | null> {
  const packageFile = await fs.readFile(
    `./node_modules/@manuscripts/${packageName}/package.json`,
    'utf-8'
  )
  const pJson = JSON.parse(packageFile)
  return parse(pJson.version)
}
