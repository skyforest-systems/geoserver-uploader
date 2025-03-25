import geoserver from '../config/geoserver'

/**
 * Create a new vector layer in GeoServer.
 * @param {string} workspaceName - The name of the workspace.
 * @param {string} storeName - The name of the store.
 * @param {string} layerName - The name of the layer.
 * @param {string} styleName - The name of the style to apply.
 * @param {string} nativeName - The native name of the layer.
 */
export async function createVectorLayer(
  workspaceName: string,
  storeName: string,
  layerName: string,
  styleName: string,
  nativeName: string
) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, '_')
  storeName = storeName.toLowerCase().replace(/ /g, '_')
  layerName = layerName.toLowerCase().replace(/ /g, '_')
  styleName = styleName.toLowerCase().replace(/ /g, '_')

  try {
    // Create the layer in GeoServer
    const response = await geoserver.post(
      `/rest/workspaces/${workspaceName}/datastores/${storeName}/featuretypes`,
      {
        featureType: {
          name: layerName,
          nativeName: nativeName,
          title: layerName,
          srs: 'EPSG:4326',
          enabled: true,
          advertised: false,
        },
      },
      {
        headers: {
          'Content-Type': `application/json`,
        },
      }
    )

    console.log(`[GeoServer] Vector layer created: ${layerName}`)

    // Apply the style to the created layer
    await geoserver.put(
      `/rest/layers/${workspaceName}:${layerName}`,
      {
        layer: {
          defaultStyle: {
            name: styleName,
          },
        },
      },
      {
        headers: {
          'Content-Type': `application/json`,
        },
      }
    )

    console.log(
      `[GeoServer] Style applied to vector layer: ${styleName} -> ${layerName}`
    )

    return {
      layerName,
      styleName,
    }
  } catch (error) {
    console.error(`[GeoServer] Error creating vector layer: ${error}`)
    throw error
  }
}
