import environments from "../environments";
import { DatasetStructure } from "../interfaces";
import {
  changeDatasetStatus,
  checkForQueuedDatasets,
  checkForReadyToQueueDatasets,
  redisClient,
  saveInitialState,
} from "../repositories/db";
import { createLayer } from "../services/createLayer";
import { createLayerGroup } from "../services/createLayerGroup";
import { createStore } from "../services/createStore";
import { createWorkspace } from "../services/createWorkspace";
import { getLayersFromWorkspace } from "../services/getLayersFromWorkspace";
import processRaster from "../services/processRaster";
import { hashDirectory } from "../utils/hashDirectory";

export async function queueController() {
  const readyDatasets = await checkForReadyToQueueDatasets();
  if (!readyDatasets) {
    console.log("[queue-controller] no ready datasets found");
    return;
  }

  if (readyDatasets.length > 0) {
    for await (const dataset of readyDatasets) {
      await changeDatasetStatus(dataset.structure.dir, "queued");
    }
  }

  const queuedDatasets = await checkForQueuedDatasets();

  if (!queuedDatasets) {
    console.log("[queue-controller] no queued datasets found");
    return;
  }
  if (queuedDatasets.length === 0) {
    console.log("[queue-controller] no datasets to process");
    return;
  }

  console.log("[queue-controller] datasets to process:", queuedDatasets);
  const processingDataset: DatasetStructure = queuedDatasets[0].structure;

  const lockKey = `lock:dataset:${processingDataset.dir}`;
  const lockTTL = 600; // Lock expires in 10 minutes

  try {
    const acquired = await redisClient.set(lockKey, "locked", {
      NX: true, // Only set if not exists
      EX: lockTTL, // Set expiry time
    });

    if (!acquired) {
      console.log(
        `[queue-controller] Lock already held for ${processingDataset.dir}`
      );
      return; // Exit if the lock is already held
    }

    try {
      await changeDatasetStatus(processingDataset.dir, "processing");

      const workspaceName = `${processingDataset.customer}_${processingDataset.year}`;
      const storeName = `${processingDataset.customer}_${processingDataset.year}_${processingDataset.dataset}`;
      const layerName = `${processingDataset.customer}_${processingDataset.year}_${processingDataset.dataset}`;
      const layerGroupName = `${processingDataset.customer}_${processingDataset.year}`;

      const processedRaster = await processRaster(processingDataset);

      await createWorkspace(workspaceName);
      await createStore(workspaceName, storeName, processedRaster);
      await createLayer(workspaceName, storeName, layerName);

      const layers = await getLayersFromWorkspace(workspaceName);
      await createLayerGroup(workspaceName, layerGroupName, layers);

      await changeDatasetStatus(processingDataset.dir, "processed");
    } catch (error) {
      await changeDatasetStatus(processingDataset.dir, "queued");
      console.error(error);
    } finally {
      console.log("[server] saving actual state & releasing lock", lockKey);
      await saveInitialState(
        hashDirectory("./files", [
          ...environments.rasterExtensions,
          ...environments.pointsExtensions,
          ...environments.analysisExtensions,
        ]) || ""
      );
      await redisClient.del(lockKey);
    }
  } catch (lockError) {
    console.error(
      `[queue-controller] Could not acquire lock for dataset ${processingDataset.dir}:`,
      lockError
    );
  }
}
