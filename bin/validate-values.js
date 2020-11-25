#!/usr/bin/env node
const deepmerge = require('deepmerge')
const fs = require('fs')
const keypath = require('keypath')
const path = require('path')

const yaml = require('yaml').default

if (process.argv.length < 4) {
    console.error('Typical usage: validate-values.js docker/values.yml [... paths to chart values.yaml files to compare to]')
    process.exit(-1)
}

const overridesPath = process.argv[2]                           // 2nd arg is overrides path (1st is the script itself, gets discarded).
const defaultPaths = process.argv.slice(3, process.argv.length) // remaining arguments are the paths to defaults values.yaml files.

console.log(overridesPath)
const overrides = yaml.parse(fs.readFileSync(overridesPath, 'utf8'))

// the containing directory name is assumed to be a subchart name.
const defaultValues = defaultPaths.map(p => {
    const vals = yaml.parse(fs.readFileSync(p, 'utf8'))
    const dirname = path.basename(path.dirname(p))
    if (dirname !== 'manuscripts-api') {
        const subchartVals = {}
        subchartVals[dirname] = vals
        return subchartVals
    }
    return vals
})

var defs = {}
defaultValues.forEach(v => defs = deepmerge(defs, v))

const criticalKeyPaths = [ 'couchbase.cluster.couchbaseAdminPass', 
                           'couchbase.cluster.couchbaseAdminUserName',
                           'app.jwtSecret' ]

criticalKeyPaths.forEach(kp => {
    const overriddenValue = keypath(kp, overrides) 
    if (!keypath(kp, overrides)) {
        console.error('Overrides:')
        console.error(JSON.stringify(overrides, null, 2))
        throw new Error(`Missing override value for keypath '${kp}'`)
    }
    if (overriddenValue === keypath(kp, defaultValues)) {
        console.error('Overrides:')
        console.error(JSON.stringify(overrides, null, 2))
        throw new Error(`Overriden value matches default for '${kp}'`)
    }
})