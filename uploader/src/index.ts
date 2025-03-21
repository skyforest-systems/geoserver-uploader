import express, { Express, Request, Response } from 'express'
import chokidar from 'chokidar'
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
} from './repositories/db'
import removeWatcher from './watcher/removeWatcher'
import { pointsWatcher } from './watcher/pointsWatcher'
import { stylesWatcher } from './watcher/stylesWatcher'
import { analysisWatcher } from './watcher/analysisWatcher'

const app: Express = express()
const port = process.env.PORT || 2000

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

  console.log(`[control] found ${totalFiles} files in the folder.`)

  if (totalFiles > 0) {
    startTime = Date.now()
  } else {
    console.log('[control] no files found in the folder.')
  }

  // Start file watcher
  const watcher = chokidar.watch(folderPath, {
    ignoreInitial: false,
    persistent: true,
    usePolling: true
  })

  let isChokidarReady = false

  watcher
    .on('add', () => {
      if (!isChokidarReady) {
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
      isChokidarReady = true
    })
    .on('all', async (event, path) => {
      // rasterWatcher should be triggered only by add, change, or deletion events
      if (!(event === 'add' || event === 'change' || event === 'unlink')) return

      // Skip files with '_output' in the name
      if (path.includes('_output')) return

      // Only consider files with the desired extensions
      const fileExtension = '.' + path.split('.').pop()
      if (!environments.extensions) return

      if (path.includes('.DS_Store')) return

      if (path.includes('raster'))
        await rasterWatcher(event, path, isChokidarReady)

      if (path.includes('points') && !path.includes('styles'))
        await pointsWatcher(event, path, isChokidarReady)

      if (path.includes('analysis') && !path.includes('styles'))
        await analysisWatcher(event, path, isChokidarReady)

      if (path.includes('styles'))
        await stylesWatcher(event, path, isChokidarReady)
    })

  setInterval(async () => {
    let israsterWatcherReady = !(await checkRasterWatcherLock())
    israsterWatcherReady && isChokidarReady && queueWatcher()
  }, 5 * 1000)

  setInterval(
    async () => {
      let israsterWatcherReady = !(await checkRasterWatcherLock())
      israsterWatcherReady && isChokidarReady && geoserverWatcher()
    },
    10 * 60 * 1000
  )

  setInterval(async () => {
    let israsterWatcherReady = !(await checkRasterWatcherLock())
    israsterWatcherReady && isChokidarReady && removeWatcher()
  }, 10 * 1000)
})
