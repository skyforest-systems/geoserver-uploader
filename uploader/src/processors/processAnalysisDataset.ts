import { DatasetStructure } from '../interfaces'
import { createLayer } from '../services/createLayer'
import { createStore } from '../services/createStore'
import { createWorkspace } from '../services/createWorkspace'
import {
  acquireLock,
  getFilesByPattern,
  changeFileStatusByBasepath,
  releaseLock,
} from '../repositories/db'
import getGeoserverNames from '../services/getGeoserverNames'
import processAnalysis from '../services/processAnalysis'
import { enqueueForFileProcessing } from '../queues/queueManager'

export default async function processAnalysisDataset(
  structure: DatasetStructure
) {
  const { workspaceName, layerGroupName, storeName, layerName } =
    getGeoserverNames(structure)

  async function acquireLayerGroupLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0
    while (attempts < maxRetries) {
      const lock = await acquireLock(layerGroupName, 60)
      if (lock) return true

      attempts++
      const delay = Math.random() * 500 * Math.pow(2, attempts)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return false
  }

  const layerGroupLock = await acquireLayerGroupLock()

  if (!layerGroupLock) {
    console.error(
      `[processAnalysisDataset] Could not acquire lock for layer group: ${layerGroupName}`
    )
    return
  }

  try {
    const analysis = await processAnalysis(structure)

    if (!analysis) {
      console.log(
        `[processAnalysisDataset] ${
          structure.dir + `/` + structure.dataset
        } is not an analysis dataset`
      )
      return
    }

    await createWorkspace(workspaceName)
    await createStore(workspaceName, storeName, analysis)
    await createLayer(workspaceName, storeName, layerName)

    const stylesToRecreate = await getFilesByPattern(
      `${workspaceName.replace('_', '/')}/styles/analysis`
    )

    console.log(
      `[processAnalysisDataset] re-queueing ${stylesToRecreate.length} styles: ${stylesToRecreate.map((e) => e.structure.dir).join(', ')}`
    )

    for (const style of stylesToRecreate) {
      await changeFileStatusByBasepath(style.basepath, 'queued')
      await enqueueForFileProcessing(style.structure)
    }
  } catch (error) {
    throw error
  } finally {
    releaseLock(layerGroupName)
  }
}
