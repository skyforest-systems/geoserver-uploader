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

export async function pointsWatcher(
  event: 'add' | 'change' | 'unlink',
  path: string,
  shouldLog = false
) {
  async function acquirePointsWatcherLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0
    while (attempts < maxRetries) {
      const lock = await acquireLock(
        'pointsWatcher::' + path,
        LOCK_TTL_FOR_FILE_WATCHER
      )
      if (lock) return true

      attempts++
      const delay = Math.random() * 100 * Math.pow(2, attempts)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return false
  }

  const lock = await acquirePointsWatcherLock()

  if (!lock) {
    console.error(
      `[pointsWatcher] could no aquire lock for ${path} after 10 attempts`
    )
    return
  }

  try {
    shouldLog &&
      console.log(`[pointsWatcher] ${event} event detected for ${path}`)
    if (event === 'add' || event === 'change') {
      let now = new Date().getTime()

      const structure = await checkStructure(path)

      if (!structure) {
        console.warn(`[pointsWatcher] invalid structure for ${path}`)

        return
      }

      shouldLog &&
        console.log(`[pointsWatcher] checking if file exists: ${path}`)
      const exists = await checkIfFileAlreadyExists(path)

      shouldLog && console.log(`[pointsWatcher] hashing file: ${path}`)
      const hash = await hashFile(path)
      if (!hash) {
        console.error(
          `[pointsWatcher] couldn't hash file: ${path} (that took ${
            new Date().getTime() - now
          }ms)`
        )
        return
      }
      shouldLog &&
        console.log(
          `[pointsWatcher] file ${path} hashed in ${
            new Date().getTime() - now
          }ms and ${
            exists ? 'already exists' : "doesn't exist"
          } at the database`
        )

      if (exists) {
        shouldLog &&
          console.log(
            `[pointsWatcher] file already exists in database: ${path}`
          )
        const file = await getFile(path)

        if (!file) return

        if (hash === file.hash && file.status === 'done') {
          shouldLog &&
            console.log(
              `[pointsWatcher] file already processed and no changes detected: ${path}`
            )
        } else {
          shouldLog &&
            console.log(
              `[pointsWatcher] file's been updated - updating file status to queued: ${path}`
            )
          await saveFile({ ...file, hash, status: 'queued' })
        }
      } else {
        const basepath = structure.dir

        shouldLog && console.log(`[pointsWatcher] saving file: ${path}`)
        await saveFile({
          path,
          basepath,
          hash: hash,
          status: 'queued',
          ts: new Date().getTime(),
          structure: structure,
        })
      }
    }

    if (event === 'unlink') {
      const structure = await checkStructure(path, true)

      if (!structure) {
        shouldLog &&
          console.log(
            `[pointsWatcher] invalid structure for ${path}, file ignored`
          )
        return
      }
      const file = await getFile(path)
      shouldLog &&
        console.log(`[pointsWatcher] updating file status to removed: ${path}`)
      await saveFile({ ...file!, status: 'removed' })
    }
  } catch (error) {
    console.error(`[pointsWatcher] error:`, error)
  } finally {
    releaseLock('pointsWatcher::' + path)
  }
}
