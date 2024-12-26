import { removeDatasetFromList } from "../repositories/db";
import { createLayerGroup } from "../services/createLayerGroup";
import { getLayersFromWorkspace } from "../services/getLayersFromWorkspace";
import { removeLayer } from "../services/removeLayer";
import { removeLayerGroup } from "../services/removeLayerGroup";
import { checkStructure } from "../utils/checkStructure";

export default async function dirRemovedController(path: string) {
  try {
    console.log(`[dir-removed-controller] dir removed: ${path}`);

    const structure = checkStructure(path, true);

    console.log(`[dir-removed-controller] structure:`, structure);

    if (!structure) {
      console.log(
        `[dir-controller] structure in ${path} isnt valid. skipping...`
      );
      return;
    }

    const workspaceName = `${structure.customer}_${structure.year}`;
    const storeName = `${structure.customer}_${structure.year}_${structure.dataset}`;
    const layerName = `${structure.customer}_${structure.year}_${structure.dataset}`;
    const layerGroupName = `${structure.customer}_${structure.year}`;

    console.log(
      `[dir-removed-controller] removing ${workspaceName}:${layerName} from geoserver`
    );
    await removeLayerGroup(workspaceName, layerGroupName);

    await removeLayer(workspaceName, layerName); // if this fails, this function won't block the execution of the code, since the layer group was already deleted and must be recreated

    console.log(
      `[dir-removed-controller] recreating layer group ${workspaceName}:${layerGroupName}`
    );
    const layers = await getLayersFromWorkspace(workspaceName);

    if (layers.length === 0) {
      console.log(
        `[dir-removed-controller] no layers found in workspace ${workspaceName}, no layer group was created`
      );
    } else {
      await createLayerGroup(workspaceName, layerGroupName, layers);
    }
    removeDatasetFromList(structure.dir);
  } catch (error) {
    console.error();
  }
}
