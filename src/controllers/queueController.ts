import { DatasetStructure } from "../interfaces";
import {
  changeDatasetStatus,
  checkForQueuedDatasets,
  checkForReadyToQueueDatasets,
  getAllDatasetsForYearAndCustomer,
} from "../repositories/db";
import { createLayer } from "../services/createLayer";
import { createLayerGroup } from "../services/createLayerGroup";
import { createStore } from "../services/createStore";
import { createWorkspace } from "../services/createWorkspace";
import { getLayersFromWorkspace } from "../services/getLayersFromWorkspace";
import processRaster from "../services/processRaster";

export async function queueController() {
  const readyDatasets = await checkForReadyToQueueDatasets();
  if (readyDatasets.length > 0) {
    for await (const dataset of readyDatasets) {
      await changeDatasetStatus(dataset.structure.dir, "queued");
    }
  }

  const queuedDatasets = await checkForQueuedDatasets();
  if (queuedDatasets.length === 0) {
    console.log("[queue-controller] no datasets to process");
    return;
  }
  console.log("[queue-controller] datasets to process:", queuedDatasets);
  const processingDataset: DatasetStructure = queuedDatasets[0].structure;

  try {
    const workspaceName = `${processingDataset.customer}_${processingDataset.year}`;
    const storeName = `${processingDataset.dataset}`;
    const layerName = `${processingDataset.dataset}`;
    const layerGroupName = `${processingDataset.customer}_${processingDataset.year}`;

    await changeDatasetStatus(processingDataset.dir, "processing");
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
  }
}
