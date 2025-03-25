import { Worker } from 'bullmq'
import { fileAnalysisProcessor } from '../../processors/fileAnalysisProcessor'
import { redisConnection } from '../../config/redis'

const createFileAnalysisWorker = (threads: number) => {
  const worker = new Worker(
    'file-analysis',
    async (job) => {
      const { path } = job.data

      console.log(`[fileAnalysisWorker] Processing file: ${path}`)

      await fileAnalysisProcessor(path)
    },
    {
      connection: redisConnection,
    }
  )

  worker.concurrency = threads

  worker.on('completed', (job) =>
    console.log(`[fileAnalysisWorker] Completed: ${job.id}`)
  )
  worker.on('failed', (job, err) =>
    console.error(`[fileAnalysisWorker] Failed: ${job?.id} - ${err.message}`)
  )
}

export default createFileAnalysisWorker
