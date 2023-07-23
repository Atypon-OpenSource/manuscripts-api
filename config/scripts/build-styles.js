// const { updatedDate } = require('./date')
const fs = require('fs')
const globby = require('globby')
const path = require('path')
const {
    evaluateXPathToArray,
    evaluateXPathToString,
    evaluateXPathToFirstNode,
} = require('fontoxpath')
const { sync, slimdom } = require('slimdom-sax-parser')

const outputDir = __dirname + '/../../dist/config/csl/styles'

if (fs.existsSync(outputDir)) {
    for (const file of globby.sync(outputDir + '/*.json')) {
        fs.unlinkSync(file)
    }
} else {
    fs.mkdirSync(outputDir)
}

const styles = {}
const items = {}

const stylesDir = __dirname + '/../csl/styles'

const stylePaths = globby.sync([
    stylesDir + '/*.csl',
    stylesDir + '/dependent/*.csl',
])

for (const stylePath of stylePaths) {
    const xml = fs.readFileSync(stylePath, 'utf-8')
    const doc = sync(xml, {})
    const info = evaluateXPathToFirstNode('style/info', doc)

    const uri = evaluateXPathToString('link[@rel="self"]/@href', info)
    if (!uri) throw new Error('Self identifier not found')

    // const updated = evaluateXPathToFirstNode('updated', info)
    // updated.nodeValue = updatedDate(stylePath)

    const [firstChar] = path.basename(uri)

    if (!(firstChar in styles)) {
        styles[firstChar] = {}
    }

    styles[firstChar][uri] = xml

    items[uri] = {
        issn: evaluateXPathToString('issn', info) || undefined,
        eissn: evaluateXPathToString('eissn', info) || undefined,
        title: evaluateXPathToString('title', info) || undefined,
        short: evaluateXPathToString('title-short', info) || undefined,
        category: evaluateXPathToArray('array{category/@field}', info).map(
            (node) => node.nodeValue
        ),
    }
}

for (const [key, items] of Object.entries(styles)) {
    fs.writeFileSync(outputDir + `/${key}.json`, JSON.stringify(items))

    const count = Object.keys(items).length
    console.log(`${key}: ${count}`)
}

fs.writeFileSync(outputDir + `/items.json`, JSON.stringify(items))
console.log(`${Object.keys(items).length} styles`)
