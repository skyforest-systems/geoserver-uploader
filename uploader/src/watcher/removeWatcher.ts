import {
  acquireLock,
  changeFileStatusByBasepath,
  getFilesByStatus,
  releaseLock,
  removeFile,
} from "../repositories/db";
import { createLayerGroupFromWorkspace } from "../services/createLayerGroupFromWorkspace";
import getGeoserverNames from "../services/getGeoserverNames";
import { removeLayer } from "../services/removeLayer";
import { removeLayerGroup } from "../services/removeLayerGroup";

const LOCK_TTL_FOR_REMOVE_WATCHER = 60 * 60; // 1 hour

export default async function removeWatcher() {
  const lock = await acquireLock("removeWatcher", LOCK_TTL_FOR_REMOVE_WATCHER);
  if (!lock) return;

  try {
    const toBeRemoved = (await getFilesByStatus("removed")).filter(
      (e) => e.path
    );

    if (toBeRemoved.length === 0) {
      // console.log(`[removeWatcher] no files to remove`);
      return;
    }

    for (let file of toBeRemoved) {
      const structure = file.structure;

      if (!structure) {
        console.warn(`[removeWatcher] invalid structure for ${file.path}`);
        continue;
      }

      const { workspaceName, layerGroupName, layerName } =
        getGeoserverNames(structure);

      await removeLayerGroup(workspaceName, layerGroupName);
      await removeLayer(workspaceName, layerName); // if this fails, this function won't block the execution of the code, since the layer group was already deleted and must be recreated
      await createLayerGroupFromWorkspace(workspaceName, layerGroupName);

      if (structure.type === "raster") {
        console.log(
          `[removeWatcher] dataset in ${structure.dir} queued to reprocessing`
        );
        await changeFileStatusByBasepath(structure.dir, "queued");
      }

      await removeFile(file.path);
    }
  } catch (error) {
    console.error(`[removeWatcher] error:`, error);
  } finally {
    await releaseLock("removeWatcher");
  }
}
