#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path');
const { js_beautify: beautify } = require('js-beautify');
const { manuscriptsFn: validator } = require('@manuscripts/json-schema');

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

const dir = path.join(__dirname, 'dist')
const file = path.join(dir, 'DataAccess/jsonSchemaValidator.js')

const js = validator + 'exports.validate = validate; exports.equal = equal'
const output = beautify(js, {indent_size: 2})

write(file, output).catch(e => console.log(e))
