import { DatasetStructure } from '../interfaces'

export default function getGeoserverNames(structure: DatasetStructure) {
  const workspaceName = `${structure.customer}_${structure.year}`
  const layerGroupName = `${structure.customer}_${structure.year}`

  if (structure.type === 'points') {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_points`,
      nativeName: `${structure.dataset}_output`,
      styleName: `${structure.customer}_${structure.year}_${structure.dataset}_points_default`,
    }
  } else if (structure.type === 'analysis') {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_analysis`,
      nativeName: ``,
      styleName: `${structure.customer}_${structure.year}_${structure.dataset}_analysis_default`,
    }
  } else if (structure.type === 'styles') {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      nativeName: '',
      styleName: `${structure.customer}_${structure.year}_${structure.dataset.replace(`/`, `_`)}`,
    }
  } else if (structure.type === 'raster') {
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
