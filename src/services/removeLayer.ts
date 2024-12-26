import geoserver from "../repositories/geoserver";

export async function removeLayer(workspace: string, layer: string) {
  try {
    await geoserver.delete(`/rest/workspaces/${workspace}/layers/${layer}`);
    console.log(
      `[remove-dataset-from-geoserver] removed layer ${layer} from workspace ${workspace}`
    );
  } catch (error) {
    console.warn(
      `[remove-dataset-from-geoserver] WARNING: Error removing layer ${layer} from workspace ${workspace}: ${error}`
    );
  }
}
