import geoserver from "../repositories/geoserver";

/**
 * Create a new store in GeoServer, removing it first if it already exists.
 * @param {string} workspaceName - The name of the workspace.
 * @param {string} storeName - The name of the store.
 * @param {string} filePath - The file path to the raster or shapefile.
 */
export async function createStore(
  workspaceName: string,
  storeName: string,
  filePath: string
) {
  try {
    // Check if the store exists
    const storeUrl = `/rest/workspaces/${workspaceName}/coveragestores/${storeName}`;
    try {
      const existsResponse = await geoserver.get(storeUrl);
      if (existsResponse.status === 200) {
        console.log(
          `[GeoServer] Store already exists: ${storeName}. Removing it.`
        );
        await geoserver.delete(storeUrl + "?recurse=true");
        console.log(`[GeoServer] Store removed: ${storeName}`);
      }
    } catch (checkError) {
      console.error(
        `[GeoServer] Error checking store existence: ${checkError}`
      );
      throw checkError;
    }

    // Create the new store
    const response = await geoserver.post(
      `/rest/workspaces/${workspaceName}/coveragestores`,
      {
        coverageStore: {
          name: storeName,
          type: "GeoTIFF",
          enabled: true,
          workspace: workspaceName,
          url: "file:///" + filePath,
        },
      }
    );
    console.log(`[GeoServer] Store created: ${storeName}`);
    return response.data;
  } catch (error) {
    console.error(`[GeoServer] Error creating store: ${error}`);
    throw error;
  }
}
