import { FileOnRedis } from '../interfaces'
import {
  acquireLock,
  changeFileStatusByBasepath,
  getFilesByStatus,
  releaseLock,
} from '../repositories/db'
import processRasterDataset from '../services/processRasterDataset'
import pLimit from 'p-limit' // Ensure you install p-limit: npm install p-limit
import processVectorDataset from '../services/processVectorDataset'
import processStyleDataset from '../services/processStyleDataset'

const TIME_BETWEEN_CHECKS = 10 * 1000 // 30 seconds
const LOCK_TTL_FOR_QUEUE_WATCHER = 12 * 60 * 60 // 12 hours
const LOCK_TTL_FOR_PROCESSING = 60 * 60 // 1 hour
const MAX_CONCURRENT_TASKS = 10 // Adjust based on system capabilities

export async function queueWatcher() {
  const lock = await acquireLock('queueWatcher', LOCK_TTL_FOR_QUEUE_WATCHER)
  if (!lock) return

  try {
    const queuedFiles = await getFilesByStatus('queued')

    if (queuedFiles.length === 0) {
      // console.log(`[queueWatcher] no queued files found`);
      return
    }

    const filesByBasepath = queuedFiles.reduce(
      (acc: { [key: string]: FileOnRedis[] }, file: FileOnRedis) => {
        acc[file.basepath] = acc[file.basepath] || []
        acc[file.basepath].push(file)
        return acc
      },
      {}
    )

    console.log(
      `[queueWatcher] detected ${queuedFiles.length} files over ${
        Object.keys(filesByBasepath).length
      } datasets to process`
    )

    const limit = pLimit(MAX_CONCURRENT_TASKS)

    // Create tasks for each basepath
    const tasks = Object.keys(filesByBasepath).map((basepath) =>
      limit(async () => {
        const files = filesByBasepath[basepath].sort((a, b) => a.ts - b.ts)
        const oldestFile = files[0]
        const now = Date.now()

        if (now - oldestFile.ts > TIME_BETWEEN_CHECKS) {
          const lock = await acquireLock(`${basepath}`, LOCK_TTL_FOR_PROCESSING)
          if (!lock) return

          console.log(`[queueWatcher] lock acquired: ${basepath}`)
          try {
            const structure = queuedFiles.find(
              (f) => f.basepath === basepath
            )?.structure

            if (!structure) {
              console.warn(`[queueWatcher] invalid structure for ${basepath}`)
              return
            }

            console.log(`[queueWatcher] processing:`, structure)

            if (structure.type === 'raster') {
              console.log(
                `[queueWatcher] processing ${structure.type}: ${basepath}`
              )
              await changeFileStatusByBasepath(basepath, 'processing')
              await processRasterDataset(structure)
              console.log(
                `[queueWatcher] finished processing ${
                  structure.type
                }: ${basepath} in ${Date.now() - now}ms`
              )
              await changeFileStatusByBasepath(basepath, 'done')
            } else if (structure.type === 'points') {
              console.log(
                `[queueWatcher] processing ${structure.type}: ${basepath}`
              )
              await changeFileStatusByBasepath(basepath, 'processing')
              await processVectorDataset(structure)
              console.log(
                `[queueWatcher] finished processing ${
                  structure.type
                }: ${basepath} in ${Date.now() - now}ms`
              )
              await changeFileStatusByBasepath(basepath, 'done')
            } else if (structure.type === 'analysis') {

              console.log(
                `[queueWatcher] processing ${structure.type}: ${basepath}`
              )
              await changeFileStatusByBasepath(basepath, 'processing')

              
              console.warn(
                `[queueWatcher] analysis processing not implemented yet`
              )
            } else if (structure.type === 'styles') {
              console.log(
                `[queueWatcher] processing ${structure.type}: ${basepath}`
              )
              await changeFileStatusByBasepath(basepath, 'processing')
              await processStyleDataset(structure)
              console.log(
                `[queueWatcher] finished processing ${
                  structure.type
                }: ${basepath} in ${Date.now() - now}ms`
              )
              await changeFileStatusByBasepath(basepath, 'done')
            }
          } catch (error) {
            console.error(`[queueWatcher] error processing ${basepath}:`, error)
            await changeFileStatusByBasepath(basepath, 'queued')
          } finally {
            await releaseLock(`${basepath}`)
            console.log(`[queueWatcher] lock released: ${basepath}`)
          }
        } else {
          console.log(
            `[queueWatcher] dataset ignored: ${basepath}, ready in ${
              (oldestFile.ts + TIME_BETWEEN_CHECKS - now) / 1000
            }s`
          )
        }
      })
    )

    // Run all tasks in parallel (with throttling)
    await Promise.all(tasks)
  } catch (error) {
    console.error(`[queueWatcher] error:`, error)
  } finally {
    await releaseLock('queueWatcher')
  }
}
