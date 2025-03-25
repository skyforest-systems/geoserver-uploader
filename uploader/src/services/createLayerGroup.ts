import geoserver from '../config/geoserver'

/**
 * Create a new layer group in GeoServer, removing it first if it already exists.
 * @param {string} groupName - The name of the layer group.
 * @param {string} workspaceName - The name of the workspace.
 * @param {Array<{name: string, href: string}>} layers - The list of layer names and their references to include in the group.
 * @param {Array<{name: string, href: string}>} styles - The list of styles names to include in the group.
 */
export async function createLayerGroup(
  groupName: string,
  workspaceName: string,
  layers: { name: string; href: string }[],
  styles: { name: string }[]
) {
  workspaceName = workspaceName.toLowerCase().replace(/ /g, '_')
  groupName = groupName.toLowerCase().replace(/ /g, '_')
  layers = layers.map((layer) => {
    return { ...layer, name: layer.name.toLowerCase().replace(/ /g, '_') }
  })
  try {
    const groupUrl = `/rest/workspaces/${workspaceName}/layergroups/${groupName}`

    // Check if the layer group exists
    try {
      const existsResponse = await geoserver.get(groupUrl)
      if (existsResponse.status === 200) {
        console.log(
          `[GeoServer] Layer group already exists: ${groupName}. Removing it.`
        )
        await geoserver.delete(groupUrl)
        console.log(`[GeoServer] Layer group removed: ${groupName}`)
      }
    } catch (checkError) {}

    // Create the new layer group
    const response = await geoserver.post(
      `/rest/workspaces/${workspaceName}/layergroups`,
      {
        layerGroup: {
          name: groupName,
          mode: 'SINGLE',
          title: groupName,
          workspace: {
            name: workspaceName,
          },
          layers: {
            layer: layers,
          },
          styles: {
            style: styles,
          },
        },
      }
    )

    console.log(`[GeoServer] Layer group created: ${groupName}`)
    return response.data
  } catch (error) {
    console.error(`[GeoServer] Error creating layer group: ${error}`)
    throw error
  }
}
