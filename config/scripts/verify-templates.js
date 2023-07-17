#!/usr/bin/env node

const fs = require('fs-extra')

const root = __dirname + '/../../dist/'

const bundleIDs = new Set()
const bundles = fs.readJSONSync(root + '/config/shared/bundles.json')

for (const bundle of bundles) {
  bundleIDs.add(bundle._id)
}

const templates = fs.readJSONSync(root + '/config/shared/templates-v2.json')

for (const template of templates) {
  if (template.objectType === 'MPManuscriptTemplate') {
    if (template.bundle) {
      if (!bundleIDs.has(template.bundle)) {
        console.warn(`* Missing bundle: ${template.bundle} (${template.title})`)
        process.exitCode = 1
      }
    }
  }
}
