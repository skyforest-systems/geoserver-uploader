import { getLayersFromWorkspace } from "../services/getLayersFromWorkspace";
import { getWorkspaces } from "../services/getWorkspaces";
import { removeWorkspace } from "../services/removeWorkspace";

export async function geoserverController() {
  try {
    // this controller executes cleanup operations on geoserver
    const workspaces = await getWorkspaces();

    for (const workspace of workspaces) {
      console.log(
        `[geoserver-controller] checking workspace ${workspace.name}`
      );
      const layers = await getLayersFromWorkspace(workspace.name);
      if (!layers || layers.length === 0) {
        console.log(
          `[geoserver-controller] no layers found in workspace ${workspace.name}, removing workspace`
        );
        await removeWorkspace(workspace.name);
      }
    }
  } catch (error) {
    console.error(`[geoserver-controller] error:`, error);
  }
}
