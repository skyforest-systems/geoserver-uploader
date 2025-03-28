import { DatasetStructure } from '../interfaces'

export default function getGeoserverNames(structure: DatasetStructure) {
  const workspaceName = `${structure.customer}_${structure.year}`
  const layerGroupName = `${structure.customer}_${structure.year}`

  if (structure.type.toLowerCase() === 'points') {
    return {
      workspaceName,
      layerGroupName: `${structure.customer}_${structure.year}_points`,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_points`,
      nativeName: `${structure.dataset}_output`,
      styleName: `${structure.customer}_${structure.year}_${structure.dataset}_points_default`,
    }
  } else if (structure.type.toLowerCase() === 'analysis') {
    return {
      workspaceName,
      layerGroupName: `${structure.customer}_${structure.year}_analysis`,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_analysis`,
      nativeName: ``,
      styleName: `${structure.customer}_${structure.year}_${structure.dataset}_analysis_default`,
    }
  } else if (structure.type.toLowerCase() === 'styles') {
    return {
      workspaceName,
      layerGroupName:
        `${structure.customer}_${structure.year}_${structure.dataset.replace('/', '_')}`.replace(
          `.sld`,
          ''
        ),
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      nativeName: '',
      styleName:
        `${structure.customer}_${structure.year}_${structure.dataset.replace(`/`, `_`)}`.replace(
          `.sld`,
          ''
        ),
    }
  } else if (structure.type.toLowerCase() === 'raster') {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      nativeName: ``,
      styleName: '',
    }
  } else {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      nativeName: '',
      styleName: '',
    }
  }
}
