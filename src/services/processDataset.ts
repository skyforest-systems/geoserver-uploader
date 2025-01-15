import { DatasetStructure } from "../interfaces";
import { acquireLock, releaseLock } from "../repositories/db";
import { createLayer } from "./createLayer";
import { createLayerGroupFromWorkspace } from "./createLayerGroupFromWorkspace";
import { createShapefileStore } from "./createShapefileStore";
import { createStore } from "./createStore";
import { createStyle } from "./createStyle";
import { createVectorLayer } from "./createVectorLayer";
import { createWorkspace } from "./createWorkspace";
import processAnalysis from "./processAnalysis";
import processRaster from "./processRaster";
import processVector from "./processVectorFile";

export default async function processDataset(structure: DatasetStructure) {
  const now = Date.now();
  const workspaceName = `${structure.customer}_${structure.year}`;
  const layerGroupName = `${workspaceName}`;

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
      `[processDataset] Could not acquire lock for layer group: ${layerGroupName}`
    );
    return;
  }

  try {
    if (structure.type === "raster") {
      const storeName = `${workspaceName}_${structure.dataset}`;
      const layerName = storeName;
      const processedRaster = await processRaster(structure);

      await createWorkspace(workspaceName);
      await createStore(workspaceName, storeName, processedRaster);
      await createLayer(workspaceName, storeName, layerName);
    } else if (structure.type === "points") {
      const storeName = `${workspaceName}_${structure.dataset}`;
      const layerName = storeName + "_points";
      const nativeName = structure.dataset + "_output";
      const styleName = storeName;
      const points = await processVector(structure);

      if (!points) {
        console.log(
          `[processDataset] ${
            structure.dir + `/` + structure.dataset
          } is not a points dataset`
        );
        return;
      }

      await createWorkspace(workspaceName);
      await createShapefileStore(workspaceName, storeName, points);
      await createStyle(workspaceName, layerName, structure);
      await createVectorLayer(
        workspaceName,
        storeName,
        layerName,
        styleName,
        nativeName
      );
    } else if (structure.type === "analysis") {
      const storeName = `${workspaceName}_${structure.dataset}`;
      const layerName = storeName + "_analysis";
      const analysis = await processAnalysis(structure);

      await createWorkspace(workspaceName);
      await createStore(workspaceName, storeName, analysis);
      await createLayer(workspaceName, storeName, layerName);
    }

    await createLayerGroupFromWorkspace(workspaceName, layerGroupName);
  } catch (error) {
    throw error;
  } finally {
    releaseLock(layerGroupName);
  }
}
