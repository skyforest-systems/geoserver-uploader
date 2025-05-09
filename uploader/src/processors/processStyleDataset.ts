import { DatasetStructure } from '../interfaces'
import { createLayerGroup } from '../services/createLayerGroup'
import { createStyle } from '../services/createStyle'
import { acquireLock, releaseLock } from '../repositories/db'
import getGeoserverNames from '../services/getGeoserverNames'
import { getLayersFromWorkspace } from '../services/getLayersFromWorkspace'
import readStyle from '../services/readStyle'

export default async function processStyleDataset(structure: DatasetStructure) {
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
      `[processRasterDataset] Could not acquire lock for layer group: ${layerGroupName}`
    )
    return
  }

  try {
    const styleContent = await readStyle(structure)
    const createdStyle = await createStyle(
      workspaceName,
      styleName,
      structure,
      styleContent
    )
    console.log(`[processStyleDataset] created style: ${createdStyle}`)

    if (structure.dataset.toLowerCase().includes('points')) {
      const layers = await getLayersFromWorkspace(workspaceName)
      const pointLayers = layers.filter((layer) =>
        layer.name.includes('_points')
      )

      if (!pointLayers || pointLayers.length === 0) {
        console.log(
          `[processStyleDataset] no point layers found in workspace ${workspaceName}, no layer group was created`
        )
        return
      }

      const stylesForLayers = pointLayers.map((_) => {
        return { name: createdStyle }
      })

      const layerGroup = await createLayerGroup(
        layerGroupName,
        workspaceName,
        pointLayers,
        stylesForLayers
      )

      return layerGroup
    } else if (structure.dataset.toLowerCase().includes('analysis')) {
      const layers = await getLayersFromWorkspace(workspaceName)
      const analysisLayers = layers.filter((layer) =>
        layer.name.includes('_analysis')
      )

      if (!analysisLayers || analysisLayers.length === 0) {
        console.log(
          `[processStyleDataset] no analysis layers found in workspace ${workspaceName}, no layer group was created`
        )
        return
      }

      const stylesForLayers = analysisLayers.map((_) => {
        return { name: createdStyle }
      })

      const layerGroup = await createLayerGroup(
        layerGroupName,
        workspaceName,
        analysisLayers,
        stylesForLayers
      )

      return layerGroup
    }
  } catch (error) {
    throw error
  } finally {
    releaseLock(layerGroupName)
  }
}
