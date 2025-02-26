import { DatasetStructure } from "../interfaces";
import { acquireLock, releaseLock } from "../repositories/db";
import { createLayerGroup } from "./createLayerGroup";
import { createStyle } from "./createStyle";
import getGeoserverNames from "./getGeoserverNames";
import { getLayersFromWorkspace } from "./getLayersFromWorkspace";
import readStyle from "./readStyle";

export default async function processStyleDataset(structure: DatasetStructure) {
  const now = Date.now();

  const {
    workspaceName,
    layerGroupName,
    storeName,
    layerName,
    nativeName,
    styleName,
  } = getGeoserverNames(structure);

  async function acquireLayerGroupLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0;
    while (attempts < maxRetries) {
      const lock = await acquireLock(layerGroupName, 60);
      if (lock) return true;

      attempts++;
      const delay = Math.random() * 500 * Math.pow(2, attempts);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
  }

  const layerGroupLock = await acquireLayerGroupLock();

  if (!layerGroupLock) {
    console.error(
      `[processRasterDataset] Could not acquire lock for layer group: ${layerGroupName}`
    );
    return;
  }

  try {
    const styleContent = await readStyle(structure);
    const createdStyle = await createStyle(
      workspaceName,
      styleName,
      structure,
      styleContent
    );
    console.log(`[processStyleDataset] created style: ${createdStyle}`);

    if (structure.dataset.includes("points")) {
      const layers = await getLayersFromWorkspace(workspaceName);
      const pointLayers = layers.filter((layer) =>
        layer.name.includes("_points")
      );

      if (!pointLayers || pointLayers.length === 0) {
        console.log(
          `[processStyleDataset] no point layers found in workspace ${workspaceName}, no layer group was created`
        );
        return;
      }

      const stylesForLayers = pointLayers.map((_) => {
        return { name: createdStyle };
      });

      const layerGroup = await createLayerGroup(
        layerGroupName,
        workspaceName,
        pointLayers,
        stylesForLayers
      );

      return layerGroup;
    } else if (structure.dataset.includes("analysis")) {
      console.log(
        "[process-styles-dataset] analysis styles processmentnot implemented yet"
      );
    }
  } catch (error) {
    throw error;
  } finally {
    releaseLock(layerGroupName);
  }
}
