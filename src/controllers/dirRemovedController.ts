import { createLayerGroupFromWorkspace } from "../services/createLayerGroupFromWorkspace";
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

    if (structure?.type === "raster") {
      const workspaceName = `${structure.customer}_${structure.year}`;
      const layerGroupName = `${structure.customer}_${structure.year}`;
      const layerName = `${structure.customer}_${structure.year}_points`;

      console.log(
        `[dir-removed-controller] removing ${workspaceName}:${layerName} from geoserver`
      );
      await removeLayerGroup(workspaceName, layerGroupName); // if this fails, this function won't block the execution of the code, since the layer was already deleted and must be recreated
      await removeLayer(workspaceName, layerName); // if this fails, this function won't block the execution of the code, since the layer group was already deleted and must be recreated
      await createLayerGroupFromWorkspace(workspaceName, layerGroupName);
    } else if (structure?.type === "points") {
    }
  } catch (error) {
    console.error();
  }
}
