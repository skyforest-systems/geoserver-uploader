import { DatasetStructure } from '../interfaces'
import { changeFileStatusByBasepath } from '../repositories/db'
import processAnalysisDataset from './processAnalysisDataset'
import processRasterDataset from './processRasterDataset'
import processStyleDataset from './processStyleDataset'
import processVectorDataset from './processVectorDataset'

export async function fileProcessingProcessor(structure: DatasetStructure) {
  try {
    console.log(`[fileProcessingProcessor] Processing dataset:`, structure)

    const now = Date.now()

    if (structure.type === 'raster') {
      console.log(
        `[fileProcessingProcessor] processing ${structure.type}: ${structure.dir}`
      )
      await changeFileStatusByBasepath(structure.dir, 'processing')
      await processRasterDataset(structure)
      console.log(
        `[fileProcessingProcessor] finished processing ${
          structure.type
        }: ${structure.dir} in ${Date.now() - now}ms`
      )
      await changeFileStatusByBasepath(structure.dir, 'done')
    } else if (structure.type === 'points') {
      console.log(
        `[fileProcessingProcessor] processing ${structure.type}: ${structure.dir}`
      )
      await changeFileStatusByBasepath(structure.dir, 'processing')
      await processVectorDataset(structure)
      console.log(
        `[fileProcessingProcessor] finished processing ${
          structure.type
        }: ${structure.dir} in ${Date.now() - now}ms`
      )
      await changeFileStatusByBasepath(structure.dir, 'done')
    } else if (structure.type === 'analysis') {
      console.log(
        `[fileProcessingProcessor] processing ${structure.type}: ${structure.dir}`
      )
      await changeFileStatusByBasepath(structure.dir, 'processing')
      await processAnalysisDataset(structure)
      await changeFileStatusByBasepath(structure.dir, 'done')
    } else if (structure.type === 'styles') {
      console.log(
        `[fileProcessingProcessor] processing ${structure.type}: ${structure.dir}`
      )
      await changeFileStatusByBasepath(structure.dir, 'processing')
      await processStyleDataset(structure)
      console.log(
        `[fileProcessingProcessor] finished processing ${
          structure.type
        }: ${structure.dir} in ${Date.now() - now}ms`
      )
      await changeFileStatusByBasepath(structure.dir, 'done')
    }
  } catch (error) {
    throw error
  }
}
