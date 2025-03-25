import { Worker } from 'bullmq'
import { redisConnection } from '../../config/redis'
import { fileProcessingProcessor } from '../../processors/fileProcessingProcessor'

const createFileProcessingWorker = (threads: number) => {
  for (let i = 0; i < threads; i++) {
    console.log(`[fileProcessingWorker] Creating worker ${i + 1} of ${threads}`)
    const worker = new Worker(
      'file-processing',
      async (job) => {
        const { structure } = job.data

        console.log(`[fileProcessingWorker] Processing file: ${structure.dir}`)

        await fileProcessingProcessor(structure)
      },
      {
        connection: redisConnection,
      }
    )

    worker.on('completed', (job) =>
      console.log(`[fileProcessingWorker] Completed: ${job.id}`)
    )
    worker.on('failed', (job, err) =>
      console.error(
        `[fileProcessingWorker] Failed: ${job?.id} - ${err.message}`
      )
    )
  }
}

export default createFileProcessingWorker
