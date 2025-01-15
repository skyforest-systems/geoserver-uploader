import { DatasetStructure } from "../interfaces";

export default function getGeoserverNames(structure: DatasetStructure) {
  return {
    workspaceName: `${structure.customer}_${structure.year}`,
    storeName: `${structure.customer}_${structure.year}`,
  };
}
