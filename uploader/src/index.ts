import environments from './config/environments'
import { enqueueForFileAnalysis } from './queues/queueManager'
import {
  releaseAllLocks,
  revertProcessingStatusToQueued,
  testRedis,
} from './repositories/db'
import countTotalFiles from './utils/countTotalFiles'
import FileWatcher from './watchers/fileWatcher'
import fileAnalysisWorker from './queues/workers/fileAnalysisWorker'
import fileProcessingWorker from './queues/workers/fileProcessingWorker'

const FILE_WATCHER_INTERVAL = parseInt(
  String(process.env.FILE_WATCHER_INTERVAL || 30 * 1000)
) // 30 seconds
const DEBUG = process.env.DEBUG === 'true'

const main = async () => {
  console.log(`[control] starting up...`)

  releaseAllLocks()
  revertProcessingStatusToQueued()

  const folderPath = './files'
  const totalFiles = countTotalFiles(folderPath)
  let processedFiles = 0
  let startTime = new Date().getTime()

  if (DEBUG) {
    console.log(`[control] debug mode is activated`)
  }

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

    await enqueueForFileAnalysis(path)
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

  const startWorkers = () => {
    fileAnalysisWorker(environments.fileanalysisWorkers)
    fileProcessingWorker(environments.fileprocessingWorkers)
  }

  startWorkers()
}

main()
