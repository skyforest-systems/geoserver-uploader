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

export async function stylesWatcher(path: string, shouldLog = false) {
  async function acquireStylesWatcherLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0
    while (attempts < maxRetries) {
      const lock = await acquireLock(
        'stylesWatcher::' + path,
        LOCK_TTL_FOR_FILE_WATCHER
      )
      if (lock) return true

      attempts++
      const delay = Math.random() * 100 * Math.pow(2, attempts)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return false
  }

  const lock = await acquireStylesWatcherLock()

  if (!lock) {
    console.error(
      `[stylesWatcher] could no aquire lock for ${path} after 10 attempts`
    )
    return
  }

  try {
    shouldLog &&
      console.log(`[stylesWatcher] ${event} event detected for ${path}`)
    let now = new Date().getTime()

    const structure = await checkStructure(path)

    if (!structure) {
      console.warn(`[stylesWatcher] invalid structure for ${path}`)

      return
    }

    shouldLog && console.log(`[stylesWatcher] checking if file exists: ${path}`)
    const exists = await checkIfFileAlreadyExists(path)

    shouldLog && console.log(`[stylesWatcher] hashing file: ${path}`)
    const hash = await hashFile(path)
    if (!hash) {
      console.error(
        `[stylesWatcher] couldn't hash file: ${path} (that took ${
          new Date().getTime() - now
        }ms)`
      )
      return
    }
    shouldLog &&
      console.log(
        `[stylesWatcher] file ${path} hashed in ${
          new Date().getTime() - now
        }ms and ${exists ? 'already exists' : "doesn't exist"} at the database`
      )

    if (exists) {
      shouldLog &&
        console.log(`[stylesWatcher] file already exists in database: ${path}`)
      const file = await getFile(path)

      if (!file) return

      if (hash === file.hash && file.status === 'done') {
        shouldLog &&
          console.log(
            `[stylesWatcher] file already processed and no changes detected: ${path}`
          )
      } else {
        shouldLog &&
          console.log(
            `[stylesWatcher] file's been updated - updating file status to queued: ${path}`
          )
        await saveFile({ ...file, hash, status: 'queued' })
      }
    } else {
      const basepath = structure.dir

      shouldLog && console.log(`[stylesWatcher] saving file: ${path}`)
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
    console.error(`[stylesWatcher] error:`, error)
  } finally {
    releaseLock('stylesWatcher::' + path)
  }
}
