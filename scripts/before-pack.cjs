const fs = require('node:fs')
const path = require('node:path')

const REQUIRED = ['out/main/index.js', 'out/preload/index.js', 'out/renderer/index.html']

/**
 * Refuses to package a build that has not been compiled yet.
 *
 * Running electron-builder on its own happily produces an .app whose asar has
 * no `out/`, and the only symptom is "Cannot find module .../out/main/index.js"
 * at launch. Failing here instead says what to do.
 */
exports.default = async function beforePack(context) {
  const root = context.packager.info.projectDir
  const missing = REQUIRED.filter((file) => !fs.existsSync(path.join(root, file)))
  if (missing.length === 0) return

  throw new Error(
    [
      '',
      'Nothing to package: the app has not been built.',
      '',
      `Missing: ${missing.join(', ')}`,
      '',
      'Run the build first, or use the scripts that do it for you:',
      '',
      '  npm run build:mac         # both Apple Silicon and Intel',
      '  npm run build:mac:arm64   # Apple Silicon only, quicker',
      ''
    ].join('\n')
  )
}
