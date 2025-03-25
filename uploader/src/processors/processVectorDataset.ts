import { DatasetStructure } from '../interfaces'
import { createShapefileStore } from '../services/createShapefileStore'
import { createVectorLayer } from '../services/createVectorLayer'
import { createWorkspace } from '../services/createWorkspace'
import {
  acquireLock,
  getFilesByPattern,
  changeFileStatusByBasepath,
  releaseLock,
} from '../repositories/db'
import getGeoserverNames from '../services/getGeoserverNames'
import processVector from '../services/processVector'

export default async function processVectorDataset(
  structure: DatasetStructure
) {
  const now = Date.now()

  const {
    workspaceName,
    layerGroupName,
    storeName,
    layerName,
    nativeName,
    styleName,
  } = getGeoserverNames(structure)

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
      `[processVectorDataset] Could not acquire lock for layer group: ${layerGroupName}`
    )
    return
  }

  try {
    const points = await processVector(structure)

    if (!points) {
      console.log(
        `[processVectorDataset] ${
          structure.dir + `/` + structure.dataset
        } is not a points dataset`
      )
      return
    }

    await createWorkspace(workspaceName)
    await createShapefileStore(workspaceName, storeName, points)
    await createVectorLayer(
      workspaceName,
      storeName,
      layerName,
      styleName,
      nativeName
    )

    const stylesToRecreate = await getFilesByPattern(
      `${workspaceName.replace('_', '/')}/styles/points`
    )

    console.log(
      `[processVectorDataset] re-queueing ${stylesToRecreate.length} styles: ${stylesToRecreate.map((e) => e.structure.dir).join(', ')}`
    )

    for (const style of stylesToRecreate) {
      await changeFileStatusByBasepath(style.basepath, 'queued')
    }
  } catch (error) {
    throw error
  } finally {
    releaseLock(layerGroupName)
  }
}
