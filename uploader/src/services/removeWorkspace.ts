import geoserver from '../config/geoserver'

/**
 * Remove a workspace in GeoServer if it exists.
 * @param {string} workspaceName - The name of the workspace to remove.
 */
export async function removeWorkspace(workspaceName: string) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, '_')
  try {
    const workspaceUrl = `/rest/workspaces/${workspaceName}`

    // Check if the workspace exists
    try {
      const existsResponse = await geoserver.get(workspaceUrl)
      if (existsResponse.status === 200) {
        console.log(
          `[GeoServer] Workspace exists: ${workspaceName}. Removing it.`
        )
        await geoserver.delete(`${workspaceUrl}?recurse=true`)
        console.log(`[GeoServer] Workspace removed: ${workspaceName}`)
      }
    } catch (checkError) {
      console.log(
        `[GeoServer] Workspace does not exist or error checking existence: ${checkError}`
      )
    }
  } catch (error) {
    console.error(`[GeoServer] Error removing workspace: ${error}`)
    throw error
  }
}
