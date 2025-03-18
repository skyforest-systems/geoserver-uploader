import fs from 'fs'
import path from 'path'

export default function countTotalFiles(
  dir: string,
  extensions?: string[]
): number {
  try {
    let fileCount = 0

    const files = fs.readdirSync(dir, { withFileTypes: true })

    files.forEach((file) => {
      const fullPath = path.join(dir, file.name)

      if (file.isDirectory()) {
        // Recursively count files in subdirectories
        fileCount += countTotalFiles(fullPath)
      } else if (file.isFile()) {
        if (extensions) {
          const fileExtension = '.' + file.name.split('.').pop()
          if (extensions.includes(fileExtension)) {
            fileCount++
          }
        } else {
          fileCount++
        }
      }
    })

    return fileCount
  } catch (error) {
    return 0
  }
}
