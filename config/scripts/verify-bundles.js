#!/usr/bin/env node

const fs = require('fs-extra')
const path = require('path')

const root = __dirname + '/../../dist/'

const bundles = fs.readJSONSync(root + '/config/shared/bundles.json')

for (const bundle of bundles) {
  if (bundle.csl) {
    const id = path.basename(bundle.csl.cslIdentifier)
    if (!fs.existsSync(root + `config/csl/styles/${id}.csl`)) {
      console.warn(`* Missing CSL file: ${id} (${bundle.csl.title})`)
      process.exitCode = 1
    }
  }
}
