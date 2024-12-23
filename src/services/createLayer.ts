import geoserver from "../repositories/geoserver";

/**
 * Create a new layer in GeoServer.
 * @param {string} workspaceName - The name of the workspace.
 * @param {string} storeName - The name of the store.
 * @param {string} layerName - The name of the layer.
 */
export async function createLayer(
  workspaceName: string,
  storeName: string,
  layerName: string
) {
  try {
    const response = await geoserver.post(
      `/rest/workspaces/${workspaceName}/coveragestores/${storeName}/coverages`,
      {
        coverage: {
          name: layerName,
          nativeName: "raster",
          title: layerName,
          srs: "EPSG:3006",
          enabled: true,
        },
      }
    );
    console.log(`[GeoServer] Layer created: ${layerName}`);
    return response.data;
  } catch (error) {
    console.error(`[GeoServer] Error creating layer: ${error}`);
    throw error;
  }
}
