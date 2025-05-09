import { DatasetStructure } from '../interfaces'
import { createLayer } from '../services/createLayer'
import { createLayerGroupFromWorkspace } from '../services/createLayerGroupFromWorkspace'
import { createStore } from '../services/createStore'
import { createWorkspace } from '../services/createWorkspace'
import { acquireLock, releaseLock } from '../repositories/db'
import getGeoserverNames from '../services/getGeoserverNames'
import processRaster from '../services/processRaster'

export default async function processRasterDataset(
  structure: DatasetStructure
) {
  const now = Date.now()

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
      `[processRasterDataset] Could not acquire lock for layer group: ${layerGroupName}`
    )
    return
  }

  try {
    const raster = await processRaster(structure)

    await createWorkspace(workspaceName)
    await createStore(workspaceName, storeName, raster)
    await createLayer(workspaceName, storeName, layerName)

    await createLayerGroupFromWorkspace(workspaceName, layerGroupName)
  } catch (error) {
    throw error
  } finally {
    releaseLock(layerGroupName)
  }
}
