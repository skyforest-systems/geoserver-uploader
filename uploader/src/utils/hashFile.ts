import * as fs from 'fs'
import SparkMD5 from 'spark-md5'

/**
 * Computes an MD5 hash for a single file using spark-md5.
 *
 * @param filePath - The path to the file to hash.
 * @param chunkSize - The size of the chunks to read (default: 2MB).
 * @param debug - Whether to enable debug logging.
 * @returns A Promise that resolves to the computed MD5 hash.
 */
export async function hashFile(
  filePath: string,
  chunkSize = 2097152,
  debug = false
): Promise<string | undefined> {
  try {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`[hashFile] file does not exist: ${filePath}`))
      }

      const stats = fs.statSync(filePath)
      if (!stats.isFile()) {
        return reject(new Error(`[hashFile] path is not a file: ${filePath}`))
      }

      const fileSize = stats.size
      const spark = new SparkMD5.ArrayBuffer()
      const stream = fs.createReadStream(filePath, {
        highWaterMark: chunkSize,
      })

      let bytesRead = 0
      stream.on('data', (chunk) => {
        bytesRead += chunk.length
        spark.append(chunk as any)

        if (debug) {
          console.log(`[hashFile] read ${bytesRead} of ${fileSize} bytes`)
        }
      })

      stream.on('end', () => {
        const hash = spark.end()
        if (debug) {
          console.log(`[hashFile] finished hashing file: ${filePath}`)
        }
        resolve(hash)
      })

      stream.on('error', (err) => {
        if (debug) {
          console.error(`[hashFile] error reading file: ${err.message}`)
        }
        reject(err)
      })
    })
  } catch (error) {
    console.error(`[hashFile] error:`, error)
    return undefined
  }
}
