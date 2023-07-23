#!/usr/bin/env node

const Database = require('better-sqlite3')
const fs = require('fs-extra')
const path = require('path')

fs.ensureDirSync('dist/config/shared')

// NOTE: need to extract bundles before templates
const files = ['bundles', 'templates-v2']

const bundleIDs = new Set()

for (const file of files) {
  const db = new Database(`config/couchbase/${file}.cblite`, {
    readonly: true,
  })

  let docs = db.prepare('SELECT * FROM docs INNER JOIN revs on docs.doc_id = revs.doc_id WHERE revs.current=1 AND revs.deleted=0')
    .all()
    .map(({ json, docid }) => ({
      _id: docid,
      ...JSON.parse(json.toString()),
    }))

  // remove bundles that reference missing CSL
  if (file === 'bundles') {
    docs = docs.filter(doc => {
      if (doc.csl) {
        const id = path.basename(doc.csl.cslIdentifier)

        if (!fs.existsSync(`dist/config/csl/styles/${id}.csl`)) {
          console.warn(`Removed bundle ${id} (${doc.csl.title}) due to missing style`)
          return false
        }

        const parentURL = doc.csl['independent-parent-URL']

        if (parentURL) {
          const parentID = path.basename(parentURL)

          if (!fs.existsSync(`dist/config/csl/styles/${parentID}.csl`)) {
            console.warn(`Removed bundle ${id} (${doc.csl.title}) due to missing parent style ${parentID}`)
            return false
          }
        }
      } else {
        console.log(doc)
      }

      return true
    })

    docs.forEach(doc => {
      bundleIDs.add(doc._id)

      if (doc.csl) {
        delete doc.csl.objectType
      }
    })
  }

  // remove derived data and invalid bundles from templates JSON
  if (file === 'templates-v2') {

    // filter out templates with unavailable bundle IDs
    docs = docs.filter(doc => {
      if (doc.objectType === 'MPManuscriptTemplate') {
        if (doc.bundle && !bundleIDs.has(doc.bundle)) {
          console.warn(`Removed template ${doc._id} (${doc.title})`)
          return false
        }
      }

      return true
    })

    docs.forEach(doc => {
      switch (doc.objectType) {
        case 'MPManuscriptTemplate': {
          // fix template objects that have requirementIDs but not mandatorySubsectionRequirements
          if (!doc.mandatorySectionRequirements && Array.isArray(doc.requirementIDs)) {
            doc.mandatorySectionRequirements = doc.requirementIDs.filter(id => id.startsWith('MPMandatorySubsectionsRequirement:'))
          }

          // rename *CharCountRequirement properties
          if (doc.maxCharCountRequirement !== undefined) {
            doc.maxCharacterCountRequirement = doc.maxCharCountRequirement
            delete doc.maxCharCountRequirement
          }

          if (doc.minCharCountRequirement !== undefined) {
            doc.minCharacterCountRequirement = doc.minCharCountRequirement
            delete doc.minCharCountRequirement
          }

          // delete unused data
          if (doc.bundle && doc.bundle.scimago) {
            delete doc.bundle.scimago
          }
        }
        break
      }
    })

    docs.forEach(doc => {
      delete doc.requirementIDs
      delete doc.requirements
      delete doc.styles
    })

    // verify that all the _id values are unique
    const ids = new Set()

    docs.forEach(doc => {
      if (!doc._id) {
        throw new Error('Missing ID')
      }

      if (ids.has(doc._id)) {
        throw new Error(`Duplicate ID ${doc._id}`)
      }

      ids.add(doc._id)

      // TODO: validate _id values of nested objects
    })
  }

  fs.writeJSONSync(`dist/config/shared/${file}.json`, docs, {
    spaces: 2
  })
}

console.info('Finished extracting databases.')

