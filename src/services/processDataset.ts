import { DatasetStructure } from "../interfaces";
import { changeFileStatusByBasepath } from "../repositories/db";
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

export default async function processDataset(
  basepath: string,
  structure: DatasetStructure
) {
  const now = Date.now();
  const workspaceName = `${structure.customer}_${structure.year}`;
  const layerGroupName = `${workspaceName}`;

  try {
    console.log(`[queueWatcher] processing ${structure.type}: ${basepath}`);
    await changeFileStatusByBasepath(basepath, "processing");

    if (structure.type === "raster") {
      const storeName = `${workspaceName}_${structure.dataset}`;
      const layerName = storeName;
      const processedRaster = await processRaster(structure);

      await createWorkspace(workspaceName);
      await createStore(workspaceName, storeName, processedRaster);
      await createLayer(workspaceName, storeName, layerName);
    } else if (structure.type === "points") {
      const storeName = `${workspaceName}_points`;
      const layerName = storeName;
      const styleName = storeName;
      const points = await processVector(structure);

      await createWorkspace(workspaceName);
      await createShapefileStore(workspaceName, storeName, points);
      await createStyle(workspaceName, layerName, structure);
      await createVectorLayer(workspaceName, storeName, layerName, styleName);
    } else if (structure.type === "analysis") {
      const storeName = `${workspaceName}_analysis`;
      const layerName = storeName;
      const analysis = await processAnalysis(structure);

      await createWorkspace(workspaceName);
      await createStore(workspaceName, storeName, analysis);
      await createLayer(workspaceName, storeName, layerName);
    }

    await createLayerGroupFromWorkspace(workspaceName, layerGroupName);
    console.log(
      `[queueWatcher] finished processing ${structure.type}: ${basepath} in ${
        Date.now() - now
      }ms`
    );

    await changeFileStatusByBasepath(basepath, "done");
  } catch (error) {
    console.error(
      `[queueWatcher] error processing ${structure.type} ${basepath}:`,
      error
    );
    await changeFileStatusByBasepath(basepath, "queued");
    throw error;
  }
}
