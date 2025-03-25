import {
  acquireLock,
  checkIfFileAlreadyExists,
  getFile,
  releaseLock,
  saveFile,
} from '../repositories/db'
import { checkStructure } from '../utils/checkStructure'
import { hashFile } from '../utils/hashFile'

const LOCK_TTL_FOR_FILE_WATCHER = 60 * 60 // 1 hour

export async function rasterWatcher(path: string, shouldLog = false) {
  async function acquirerasterWatcherLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0
    while (attempts < maxRetries) {
      const lock = await acquireLock(
        'rasterWatcher::' + path,
        LOCK_TTL_FOR_FILE_WATCHER
      )
      if (lock) return true

      attempts++
      const delay = Math.random() * 100 * Math.pow(2, attempts)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return false
  }

  const lock = await acquirerasterWatcherLock()

  if (!lock) {
    console.error(
      `[rasterWatcher] could no aquire lock for ${path} after 10 attempts`
    )
    return
  }

  try {
    shouldLog && console.log(`[rasterWatcher] event detected for ${path}`)
    let now = new Date().getTime()
    const structure = await checkStructure(path)

    if (!structure) {
      console.warn(`[rasterWatcher] invalid structure for ${path}`)
      return
    }

    shouldLog && console.log(`[rasterWatcher] checking if file exists: ${path}`)
    const exists = await checkIfFileAlreadyExists(path)

    shouldLog && console.log(`[rasterWatcher] hashing file: ${path}`)
    const hash = await hashFile(path)
    if (!hash) {
      console.error(
        `[rasterWatcher] couldn't hash file: ${path} (that took ${
          new Date().getTime() - now
        }ms)`
      )
      return
    }
    shouldLog &&
      console.log(
        `[rasterWatcher] file ${path} hashed in ${
          new Date().getTime() - now
        }ms and ${exists ? 'already exists' : "doesn't exist"} at the database`
      )

    if (exists) {
      shouldLog &&
        console.log(`[rasterWatcher] file already exists in database: ${path}`)
      const file = await getFile(path)

      if (!file) return

      if (hash === file.hash && file.status === 'done') {
        shouldLog &&
          console.log(
            `[rasterWatcher] file already processed and no changes detected: ${path}`
          )
      } else {
        shouldLog &&
          console.log(
            `[rasterWatcher] file's been updated - updating file status to queued: ${path}`
          )
        await saveFile({ ...file, hash, status: 'queued' })
      }
    } else {
      const basepath = structure.dir

      shouldLog && console.log(`[rasterWatcher] saving file: ${path}`)
      await saveFile({
        path,
        basepath,
        hash: hash,
        status: 'queued',
        ts: new Date().getTime(),
        structure: structure,
      })
    }
  } catch (error) {
    console.error(`[rasterWatcher] error:`, error)
  } finally {
    releaseLock('rasterWatcher::' + path)
  }
}
