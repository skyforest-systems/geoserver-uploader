import { Queue } from 'bullmq'
import environments from '../config/environments'
import { redisConnection } from '../config/redis'
import { DatasetStructure } from '../interfaces'

const fileAnalysisQueue = new Queue('file-analysis', {
  connection: redisConnection,
})

const fileProcessingQueue = new Queue('file-processing', {
  connection: {
    host: environments.redisHost,
    port: parseInt(environments.redisPort),
  },
})

export async function enqueueForFileAnalysis(path: string) {
  await fileAnalysisQueue.add('file-analysis', { path })
}

export async function enqueueForFileProcessing(structure: DatasetStructure) {
  await fileProcessingQueue.add(
    'file-processing',
    { structure },
    {
      deduplication: {
        id: structure.dir,
      },
      delay: 1000 * 60 * 5, // Wait 5 minutes before processing the file to ensure the analysis of the whole dataset is done
      attempts: 3,
    }
  )
}
