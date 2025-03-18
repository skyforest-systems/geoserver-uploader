import geoserver from '../repositories/geoserver'

/**
 * Create a new workspace in GeoServer if it doesn't already exist.
 * @param {string} workspaceName - The name of the workspace.
 */
export async function createWorkspace(workspaceName: string) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, '_')
  try {
    // Check if the workspace exists
    const existsResponse = await geoserver.get(
      `/rest/workspaces/${workspaceName}`
    )
    if (existsResponse.status === 200) {
      console.log(`[GeoServer] Workspace already exists: ${workspaceName}`)
      return { message: 'Workspace already exists', workspace: workspaceName }
    }
  } catch (error) {
    // @ts-expect-error
    if (error.response?.status !== 404) {
      // If the error is not 404 (workspace not found), rethrow it
      console.error(`[GeoServer] Error checking workspace existence: ${error}`)
      throw error
    }
    // Workspace does not exist, proceed to creation
  }

  try {
    const response = await geoserver.post('/rest/workspaces', {
      workspace: { name: workspaceName },
    })
    console.log(`[GeoServer] Workspace created: ${workspaceName}`)
    return response.data
  } catch (error) {
    console.error(`[GeoServer] Error creating workspace: ${error}`)
    throw error
  }
}
