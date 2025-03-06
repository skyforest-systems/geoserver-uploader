import geoserver from '../repositories/geoserver'
import { DatasetStructure } from '../interfaces'
import { xml2js, js2xml } from 'xml-js'

export async function createStyle(
  workspaceName: string,
  styleName: string,
  structure: DatasetStructure,
  styleContent: string
) {
  const { dir } = structure
  workspaceName = workspaceName.toLowerCase().replace(/ /g, '_')
  styleName = styleName.toLowerCase().replace(/ /g, '_')

  // const parser = new DOMParser();
  // const xmlStyle = parser.parseFromString(String(styleContent), "text/xml");

  const xmlStyle: any = xml2js(styleContent, { compact: true })

  console.log(JSON.stringify(xmlStyle))

  try {
    xmlStyle['StyledLayerDescriptor']['NamedLayer']['se:Name']['_text'] =
      styleName
    xmlStyle['StyledLayerDescriptor']['NamedLayer']['UserStyle']['se:Name'][
      '_text'
    ] = styleName
  } catch (error) {
    console.warn(
      `[createStyle] Couldn't redefine styleName, going with default`
    )
  }

  console.log(JSON.stringify(xmlStyle))

  const style = js2xml(xmlStyle, { compact: true })

  console.log('style >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', style)

  try {
    // Check if style exists
    console.log(`[GeoServer] Checking if style exists: ${styleName}`)
    try {
      await geoserver.get(
        `/rest/workspaces/${workspaceName}/styles/${styleName}`
      )
      // If no error is thrown, the style exists. Update it.
      console.log(`[GeoServer] Style exists. Updating: ${styleName}`)
      await geoserver.put(
        `/rest/workspaces/${workspaceName}/styles/${styleName}`,
        style,
        {
          headers: {
            'Content-Type': 'application/vnd.ogc.sld+xml',
          },
        }
      )
      console.log(`[GeoServer] Style updated: ${styleName}`)
      return styleName
    } catch (err) {}

    try {
      console.log(`[GeoServer] Style does not exists, creating new one`)

      await geoserver.post(`/rest/workspaces/${workspaceName}/styles`, style, {
        headers: {
          'Content-Type': 'application/vnd.ogc.sld+xml',
        },
      })
      console.log(`[GeoServer] Style created: ${styleName}`)
      return styleName
    } catch (error) {
      throw error
    }
  } catch (error) {
    console.error(`[GeoServer] Error creating or updating style: ${error}`)
    throw error
  }
}
