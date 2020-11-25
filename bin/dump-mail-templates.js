#!/usr/bin/env node

const emailTemplates = require('email-templates')
const fs = require('fs')
const path = require('path')
const recurse = require('recursive-readdir')

const locals = {
  email: 'al@einstein.org',
  project: {
    _id: 'AF91298B-03A4-4690-AC40-D4D849B5926B'
  },
  containerTitle: 'General Relativity',
  frontendAppHostname: 'manuscripts.io',
  frontendAppBaseURL: 'https://dev.manuscripts.io',
  tokenID: 'A81A3C57-15B9-4997-BC1F-EB17BA0E27D0',
  invitingUser: {
    'name': 'Alan Turing'
  },
  invitedUser: {
    'name': 'Albert'
  },
  role: 'writer',
  actionURL: 'derp'
}

recurse('emails').then(allFiles => {
  const emailNames = [...new Set(
    allFiles.filter(x => path.extname(x) === '.pug' && x.indexOf('partials') < 0)
                             .map(x => path.basename(path.dirname(x)))
                             .filter(x => x !== 'emails')
                             .reduce((acc, v) => acc.concat(v), []))]

    const templates = new emailTemplates({SES: {accessKeyId: 'herp', secretAccessKey: 'derp', region: 'us-east-1'}})

    for (const emailName of emailNames) {
      templates.render(`${emailName}/html`, locals)
              .then((renderedTemplate) => fs.writeFileSync(`emails/rendered/${emailName}.html`, renderedTemplate))
              .catch((e) => {
                console.error(e)
                process.exit(-1)
              })
    }
})
.catch(e => {
  console.error(e)
  process.exit(-1)
})
