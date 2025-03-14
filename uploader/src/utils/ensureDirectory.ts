const fs = require('fs')
const path = require('path')

/**
 * Ensures the directory structure exists for a given file or directory name.
 * @param {string} targetPath - The file or directory name.
 * @returns {Promise<void>}
 */
export default async function ensureDirectory(targetPath: string) {
  const dirPath = path.extname(targetPath)
    ? path.dirname(targetPath)
    : targetPath
  await fs.promises.mkdir(dirPath, { recursive: true })
}
