import geoserver from '../config/geoserver'
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

  const xmlStyle: any = xml2js(styleContent, { compact: true })

  function ensurePath(obj: any, path: string[]) {
    return path.reduce((acc, key, index) => {
      if (!acc[key]) {
        acc[key] = index === path.length - 1 ? { _text: '' } : {}
      }
      return acc[key]
    }, obj)
  }

  if (styleContent.includes('se:Name')) {
    try {
      ensurePath(xmlStyle, ['StyledLayerDescriptor', 'NamedLayer', 'se:Name'])[
        '_text'
      ] = styleName
    } catch (error) {
      console.warn(
        `[createStyle] Couldn't redefine styleName at 'se:Name', going with default`
      )
    }

    try {
      ensurePath(xmlStyle, [
        'StyledLayerDescriptor',
        'NamedLayer',
        'UserStyle',
        'se:Name',
      ])['_text'] = styleName
    } catch {
      console.warn(
        `[createStyle] Couldn't redefine styleName at 'UserStyle.se:Name', going with default`
      )
    }
  } else {
    try {
      ensurePath(xmlStyle, [
        'StyledLayerDescriptor',
        'NamedLayer',
        'UserStyle',
        'Name',
      ])['_text'] = styleName
    } catch {
      console.warn(
        `[createStyle] Couldn't redefine styleName at 'UserStyle.Name', going with default`
      )
    }

    try {
      ensurePath(xmlStyle, ['StyledLayerDescriptor', 'NamedLayer', 'Name'])[
        '_text'
      ] = styleName
    } catch {
      console.warn(
        `[createStyle] Couldn't redefine styleName at 'NamedLayer.Name', going with default`
      )
    }
  }

  const style = js2xml(xmlStyle, { compact: true })

  try {
    console.log(`[GeoServer] Checking if style exists: ${styleName}`)
    try {
      await geoserver.get(
        `/rest/workspaces/${workspaceName}/styles/${styleName}`
      )
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
      console.log(`[GeoServer] Style does not exist, creating new one`)

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
