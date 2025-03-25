import express, { Express, Request, Response } from 'express'
import environments from './environments'
import { rasterWatcher } from './watcher/rasterWatcher'
import { queueWatcher } from './watcher/queueWatcher'
import countTotalFiles from './utils/countTotalFiles'
import { geoserverWatcher } from './watcher/geoserverWatcher'
import getLocks, {
  checkRasterWatcherLock,
  releaseAllLocks,
  removeFilesByBasepath,
  revertProcessingStatusToQueued,
  testRedis,
} from './repositories/db'
import removeWatcher from './watcher/removeWatcher'
import { pointsWatcher } from './watcher/pointsWatcher'
import { stylesWatcher } from './watcher/stylesWatcher'
import { analysisWatcher } from './watcher/analysisWatcher'
import FileWatcher from './watcher/fileWatcher'

const app: Express = express()
const port = process.env.PORT || 2000

const FILE_WATCHER_INTERVAL = parseInt(
  String(process.env.FILE_WATCHER_INTERVAL || 30 * 1000)
) // 30 seconds
const QUEUE_WATCHER_INTERVAL = parseInt(
  String(process.env.QUEUE_WATCHER_INTERVAL || 5 * 1000)
) // 5 seconds
const GEOSERVER_WATCHER_INTERVAL = parseInt(
  String(process.env.GEOSERVER_WATCHER_INTERVAL || 10 * 60 * 1000)
) // 10 minutes
const REMOVE_WATCHER_INTERVAL = parseInt(
  String(process.env.REMOVE_WATCHER_INTERVAL || 10 * 1000)
) // 10 seconds

app.get('/locks', async (req: Request, res: Response) => {
  res.send(await getLocks())
})

app.delete(
  '/files-by-basepath/:basepath(*)',
  async (req: Request, res: Response) => {
    try {
      const { basepath } = req.params
      const deletedKeys = await removeFilesByBasepath(basepath)
      console.log(
        `[control] DELETE /files-by-basepath/${req.params.basepath}: ${deletedKeys.length} keys deleted`
      )
      res.status(200).send(deletedKeys)
    } catch (error) {
      console.error(
        `[control] DELETE /files-by-basepath/${req.params.basepath} failed:`,
        error
      )
      res.status(500).send(error)
    }
  }
)

app.listen(port, async () => {
  console.log(`[control] starting up...`)

  releaseAllLocks()
  revertProcessingStatusToQueued()

  const folderPath = './files'
  const totalFiles = countTotalFiles(folderPath)
  let processedFiles = 0
  let startTime = new Date().getTime()

  console.log(`[control] testing redis connection...`)
  await testRedis()
  console.log(`[control] redis connection is working`)

  console.log(
    `[control] waiting 10 seconds before starting the file watcher...`
  )
  await new Promise((resolve) => setTimeout(resolve, 10000))

  console.log(`[control] found ${totalFiles} files in the folder.`)

  if (totalFiles > 0) {
    startTime = Date.now()
  } else {
    console.log('[control] no files found in the folder.')
  }

  const watcher = new FileWatcher(folderPath, FILE_WATCHER_INTERVAL)
  watcher.start()

  let isFileWatcherReady = false

  const watcherHandler = async (path: string) => {
    // Skip files with '_output' in the name
    if (path.includes('_output')) return
    // Only consider files with the desired extensions
    if (!environments.extensions) return
    if (path.includes('.DS_Store')) return
    if (path.includes('raster')) await rasterWatcher(path, isFileWatcherReady)
    if (path.includes('points') && !path.includes('styles'))
      await pointsWatcher(path, isFileWatcherReady)
    if (path.includes('analysis') && !path.includes('styles'))
      await analysisWatcher(path, isFileWatcherReady)
    if (path.includes('styles')) await stylesWatcher(path, isFileWatcherReady)
  }

  watcher
    .on('add', () => {
      if (!isFileWatcherReady) {
        processedFiles++
        const elapsedTime = (Date.now() - (startTime || 0)) / 1000 // in seconds
        const eta = processedFiles
          ? Math.round(
              ((totalFiles - processedFiles) * elapsedTime) / processedFiles
            )
          : 0

        console.log(
          `[control] first run progress: ${processedFiles}/${totalFiles} (${
            parseInt(String((processedFiles / totalFiles) * 10000)) / 100
          }%) files processed. ETA: ${eta}s`
        )
      }
    })
    .on('ready', async () => {
      console.log(
        `[control] first run done in ${
          (Date.now() - startTime) / 1000
        }s, file watcher is ready for new changes.`
      )
      isFileWatcherReady = true
    })
    .on('add', watcherHandler)
    .on('change', watcherHandler)

  setInterval(async () => {
    let israsterWatcherReady = !(await checkRasterWatcherLock())
    israsterWatcherReady && isFileWatcherReady && queueWatcher()
  }, QUEUE_WATCHER_INTERVAL)

  setInterval(async () => {
    let israsterWatcherReady = !(await checkRasterWatcherLock())
    israsterWatcherReady && isFileWatcherReady && geoserverWatcher()
  }, GEOSERVER_WATCHER_INTERVAL)

  setInterval(async () => {
    let israsterWatcherReady = !(await checkRasterWatcherLock())
    israsterWatcherReady && isFileWatcherReady && removeWatcher()
  }, REMOVE_WATCHER_INTERVAL)
})
