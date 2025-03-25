import environments from '../config/environments'
import { enqueueForFileProcessing } from '../queues/queueManager'
import { checkIfFileAlreadyExists, getFile, saveFile } from '../repositories/db'
import { checkStructure } from '../utils/checkStructure'
import { hashFile } from '../utils/hashFile'

export async function fileAnalysisProcessor(path: string) {
  try {
    environments.debug &&
      console.log(`[fileAnalysisProcessor] Analysing file: ${path}`)
    let now = new Date().getTime()

    const structure = await checkStructure(path)

    if (!structure) {
      environments.debug &&
        console.warn(`[fileAnalysisProcessor] invalid structure for ${path}`)
      return
    }

    environments.debug &&
      console.log(`[fileAnalysisProcessor] hashing file: ${path}`)
    const hash = await hashFile(path)
    if (!hash) {
      console.error(
        `[fileAnalysisProcessor] couldn't hash file: ${path} (that took ${
          new Date().getTime() - now
        }ms)`
      )
      return
    }

    environments.debug &&
      console.log(`[fileAnalysisProcessor] checking if file exists: ${path}`)
    const exists = await checkIfFileAlreadyExists(path)

    environments.debug &&
      console.log(
        `[fileAnalysisProcessor] file ${path} hashed in ${
          new Date().getTime() - now
        }ms and ${exists ? 'already exists' : "doesn't exist"} at the database`
      )

    if (exists) {
      environments.debug &&
        console.log(
          `[fileAnalysisProcessor] file already exists in database: ${path}`
        )
      const file = await getFile(path)

      if (!file) return

      if (hash === file.hash && file.status === 'done') {
        environments.debug &&
          console.log(
            `[fileAnalysisProcessor] file already processed and no changes detected: ${path}`
          )
      } else {
        environments.debug &&
          console.log(
            `[fileAnalysisProcessor] file's been updated - updating file status to queued: ${path}`
          )
        await saveFile({ ...file, hash, status: 'queued' })
        await enqueueForFileProcessing(structure)
      }
    } else {
      const basepath = structure.dir

      environments.debug &&
        console.log(`[fileAnalysisProcessor] saving file: ${path}`)
      await saveFile({
        path,
        basepath,
        hash: hash,
        status: 'queued',
        ts: new Date().getTime(),
        structure: structure,
      })
      await enqueueForFileProcessing(structure)
    }
  } catch (error) {
    throw error
  }
}
