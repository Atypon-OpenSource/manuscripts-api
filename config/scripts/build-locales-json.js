const CSL = require('citeproc');
const fs = require('fs');
const globby = require('globby');
const path = require('path');

const outputDir = __dirname + '/../../dist/config/csl/locales';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const locales = {};
const localesDir = __dirname + '/../csl/locales';
const localePaths = globby.sync([localesDir + '/locales-*.xml']);

for (const localePath of localePaths) {
  const basename = path.basename(localePath, '.xml');
  const matches = basename.match(/^locales-(.+)$/);
  if (!matches) {
    throw new Error('No match');
  }
  const localeName = matches[1];
  console.log(localeName);

  const xml = fs.readFileSync(localePath, 'utf-8');
  locales[localeName] = CSL.parseXml(xml);
}

console.log(`${Object.keys(locales).length} locales`);

fs.writeFileSync(outputDir + '/locales.json', JSON.stringify(locales))
fs.writeFileSync(outputDir + '/metadata.json', fs.readFileSync(localesDir + '/locales.json'))
