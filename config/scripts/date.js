const { execSync } = require('child_process')
const path = require('path')

// https://github.com/citation-style-language/distribution-updater/blob/master/scripts/styles_distribution.py
exports.updatedDate = (stylePath) => {
    const relativeStylePath = path.relative(stylesDir, stylePath)
    const mdate = execSync(
        `git --git-dir="${stylesDir}/.git" log --format=%cI --max-count=1 -- "${relativeStylePath}"`,
        {
            encoding: 'utf-8',
        }
    ).trim()
    if (!mdate) throw new Error('updated date not found')
    const utcmdate = new Date(mdate).toISOString()
    console.log(utcmdate)
    return utcmdate
}
