import { DatasetStructure, FileOnRedis } from "../interfaces";
import {
  acquireLock,
  changeFileStatusByBasepath,
  getFilesByStatus,
  releaseLock,
} from "../repositories/db";
import { createLayer } from "../services/createLayer";
import { createLayerGroupFromWorkspace } from "../services/createLayerGroupFromWorkspace";
import { createShapefileStore } from "../services/createShapefileStore";
import { createStore } from "../services/createStore";
import { createStyle } from "../services/createStyle";
import { createVectorLayer } from "../services/createVectorLayer";
import { createWorkspace } from "../services/createWorkspace";
import { getLayersFromWorkspace } from "../services/getLayersFromWorkspace";
import processAnalysis from "../services/processAnalysis";
import processDataset from "../services/processDataset";
import processRaster from "../services/processRaster";
import processVector from "../services/processVectorFile";
import { checkStructure } from "../utils/checkStructure";

export async function queueWatcher() {
  try {
    const queuedFiles = await getFilesByStatus("queued");
    if (queuedFiles.length === 0) return;

    const filesByBasepath = queuedFiles.reduce(
      (acc: { [key: string]: FileOnRedis[] }, file: FileOnRedis) => {
        acc[file.basepath] = acc[file.basepath] || [];
        acc[file.basepath].push(file);
        return acc;
      },
      {}
    );

    console.log(
      `[queueWatcher] detected ${queuedFiles.length} files over ${
        Object.keys(filesByBasepath).length
      } datasets to process`
    );

    for (const basepath of Object.keys(filesByBasepath)) {
      const files = filesByBasepath[basepath].sort((a, b) => a.ts - b.ts);
      const oldestFile = files[0];
      const now = Date.now();

      if (now - oldestFile.ts > 10 * 1000) {
        const lock = await acquireLock(`lock::${basepath}`);
        if (!lock) continue;

        console.log(`[queueWatcher] lock acquired: ${basepath}`);
        try {
          const structure = checkStructure(basepath);
          if (!structure) {
            console.warn(`[queueWatcher] invalid structure for ${basepath}`);
            continue;
          }
          await processDataset(basepath, structure);
        } catch (error) {
          console.error(`[queueWatcher] error for dataset ${basepath}:`, error);
        } finally {
          await releaseLock(`lock::${basepath}`);
          console.log(`[queueWatcher] lock released: ${basepath}`);
        }
      } else {
        console.log(
          `[queueWatcher] dataset ignored: ${basepath}, ready in ${
            (oldestFile.ts + 10 * 1000 - now) / 1000
          }s`
        );
      }
    }
  } catch (error) {
    console.error(`[queueWatcher] error:`, error);
  }
}
