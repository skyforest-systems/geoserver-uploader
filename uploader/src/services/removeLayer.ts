import geoserver from '../config/geoserver'

export async function removeLayer(workspace: string, layer: string) {
  workspace = workspace.toLowerCase().replace(/ /g, '_')
  layer = layer.toLowerCase().replace(/ /g, '_')
  try {
    await geoserver.delete(`/rest/workspaces/${workspace}/layers/${layer}`)
    console.log(
      `[remove-dataset-from-geoserver] removed layer ${layer} from workspace ${workspace}`
    )
  } catch (error) {
    console.warn(
      `[remove-dataset-from-geoserver] WARNING: Error removing layer ${layer} from workspace ${workspace}: ${error}`
    )
  }
}
