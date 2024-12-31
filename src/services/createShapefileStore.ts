import geoserver from "../repositories/geoserver";

/**
 * Create a new shapefile store in GeoServer, removing it first if it already exists.
 * @param {string} workspaceName - The name of the workspace.
 * @param {string} storeName - The name of the store.
 * @param {string} filePath - The file path to the shapefile dataset.
 */
export async function createShapefileStore(
  workspaceName: string,
  storeName: string,
  filePath: string
) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, "_");
  storeName = storeName.toLowerCase().replace(/ /g, "_");
  try {
    // Check if the store exists
    const storeUrl = `/rest/workspaces/${workspaceName}/datastores/${storeName}`;
    try {
      const existsResponse = await geoserver.get(storeUrl);
      if (existsResponse.status === 200) {
        console.log(
          `[GeoServer] Store already exists: ${storeName}. Removing it.`
        );
        await geoserver.delete(storeUrl + "?recurse=true");
        console.log(`[GeoServer] Store removed: ${storeName}`);
      }
    } catch (checkError) {}

    // Create the new vector store
    const response = await geoserver.post(
      `/rest/workspaces/${workspaceName}/datastores`,
      {
        dataStore: {
          name: storeName,
          type: "Shapefile",
          enabled: true,
          workspace: workspaceName,
          connectionParameters: {
            entry: [
              { "@key": "url", $: `file:///${filePath}` },
              { "@key": "charset", $: "UTF-8" },
            ],
          },
        },
      }
    );

    console.log(`[GeoServer] Vector store created: ${storeName}`);
    return response.data;
  } catch (error) {
    console.error(`[GeoServer] Error creating vector store: ${error}`);
    throw error;
  }
}
