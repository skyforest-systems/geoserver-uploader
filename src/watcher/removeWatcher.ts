import environments from "../environments";
import { FileOnRedis } from "../interfaces";
import {
  acquireLock,
  changeFileStatusByBasepath,
  getFilesByStatus,
  releaseLock,
  removeFile,
} from "../repositories/db";
import countTotalFiles from "../services/countTotalFiles";
import { createLayerGroupFromWorkspace } from "../services/createLayerGroupFromWorkspace";
import { removeLayer } from "../services/removeLayer";
import { removeLayerGroup } from "../services/removeLayerGroup";
import { checkStructure } from "../utils/checkStructure";

const LOCK_TTL_FOR_REMOVE_WATCHER = 60 * 60; // 1 hour

export default async function removeWatcher() {
  const lock = await acquireLock("removeWatcher", LOCK_TTL_FOR_REMOVE_WATCHER);
  if (!lock) return;

  try {
    const toBeRemoved = (await getFilesByStatus("removed")).filter(
      (e) => e.basepath
    );

    if (toBeRemoved.length === 0) {
      console.log(`[removeWatcher] no files to remove`);
      return;
    }

    const filesByBasepath: { [key: string]: FileOnRedis[] } =
      toBeRemoved.reduce(
        (acc: { [key: string]: FileOnRedis[] }, file: FileOnRedis) => {
          acc[file.basepath] = acc[file.basepath] || [];
          acc[file.basepath].push(file);
          return acc;
        },
        {}
      );

    for (const basepath of Object.keys(filesByBasepath)) {
      let countOfFilesAtThisBasepath = await countTotalFiles(
        "/" + basepath,
        environments.extensions
      );

      if (countOfFilesAtThisBasepath === 0) {
        console.log(`[removeWatcher] no more files in ${basepath}, removing`);

        const structure = checkStructure(basepath);

        if (!structure) {
          console.warn(`[removeWatcher] invalid structure for ${basepath}`);
          continue;
        }

        const workspaceName = `${structure.customer}_${structure.year}`;
        const layerGroupName = `${structure.customer}_${structure.year}`;
        const layerName = `${structure.customer}_${structure.year}${
          structure.type === "raster" ? "" : "_" + structure.type
        }`;

        console.log(
          `[removeWatcher] removing ${workspaceName}:${layerName} from geoserver`
        );
        await removeLayerGroup(workspaceName, layerGroupName); // if this fails, this function won't block the execution of the code, since the layer was already deleted and must be recreated
        await removeLayer(workspaceName, layerName); // if this fails, this function won't block the execution of the code, since the layer group was already deleted and must be recreated
        await createLayerGroupFromWorkspace(workspaceName, layerGroupName);
      } else {
        console.log(
          `[removeWatcher] ${countOfFilesAtThisBasepath} files in ${basepath}, queueing for reprocessing`
        );
        await changeFileStatusByBasepath(basepath, "queued");
      }

      for await (const file of filesByBasepath[basepath]) {
        await removeFile(file.path);
      }
    }
  } catch (error) {
    console.error(`[removeWatcher] error:`, error);
  } finally {
    await releaseLock("removeWatcher");
  }
}
