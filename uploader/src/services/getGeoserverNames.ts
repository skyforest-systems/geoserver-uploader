import { RasterDatasetStructure } from "../interfaces";

export default function getGeoserverNames(structure: RasterDatasetStructure) {
  const workspaceName = `${structure.customer}_${structure.year}`;
  const layerGroupName = `${structure.customer}_${structure.year}`;

  if (structure.type === "points") {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_points`,
      nativeName: `${structure.dataset}_output`,
      styleName: `${structure.customer}_${structure.year}_${structure.dataset}`,
    };
  } else if (structure.type === "analysis") {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}_analysis`,
      nativeName: ``,
      styleName: "",
    };
  } else {
    return {
      workspaceName,
      layerGroupName,
      storeName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      layerName: `${structure.customer}_${structure.year}_${structure.dataset}`,
      nativeName: "",
      styleName: "",
    };
  }
}
