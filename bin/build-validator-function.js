#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { js_beautify: beautify } = require('js-beautify')
const {
  manuscriptsFn,
} = require('@manuscripts/manuscripts-json-schema')

const distDir = path.join(__dirname, '..', 'dist')

// assert a directory called ./dist exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir)
}

const createValidatorFunction = (outputFile, validator) => {
  const js = validator + 'exports.validate = validate; exports.equal = equal'
  const output = beautify(js, { indent_size: 2 })

  fs.writeFileSync(path.join(distDir, outputFile), output, 'utf8')
}

createValidatorFunction(
  'DataAccess/jsonSchemaValidator.js',
  manuscriptsFn
)

