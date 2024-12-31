import geoserver from "../repositories/geoserver";

/**
 * Remove a layer group in GeoServer if it exists.
 * @param {string} groupName - The name of the layer group.
 * @param {string} workspaceName - The name of the workspace.
 */
export async function removeLayerGroup(
  groupName: string,
  workspaceName: string
) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, "_");
  groupName = groupName.toLowerCase().replace(/ /g, "_");
  try {
    const groupUrl = `/rest/workspaces/${workspaceName}/layergroups/${groupName}`;

    // Check if the layer group exists
    try {
      const existsResponse = await geoserver.get(groupUrl);
      if (existsResponse.status === 200) {
        console.log(
          `[GeoServer] Layer group exists: ${groupName}. Removing it.`
        );
        await geoserver.delete(groupUrl);
        console.log(`[GeoServer] Layer group removed: ${groupName}`);
      }
    } catch (checkError) {
      console.log(
        `[GeoServer] Layer group does not exist or error checking existence: ${checkError}`
      );
    }
  } catch (error) {
    console.error(`[GeoServer] Error removing layer group: ${error}`);
  }
}
