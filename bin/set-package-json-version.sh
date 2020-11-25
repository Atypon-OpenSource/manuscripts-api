#!/usr/bin/env node
const child_process = require('child_process')
const fs = require('fs')

const packageJSONPath = `${__dirname}/../package.json`
const ver = child_process.execSync('./bin/get-version.sh').toString().trim()
const revhead = child_process.execSync('git rev-parse HEAD').toString().trim()
const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'))

packageJSON.version = ver
packageJSON.commit = revhead

fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 4))
console.log(`Modified package.json in place to modify version (${ver}) + git commit hash (${revhead}).`)