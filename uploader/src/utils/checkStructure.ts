import { RasterDatasetStructure } from "../interfaces";

export function checkStructure(
  path: string,
  fullPath?: boolean
): RasterDatasetStructure | null {
  let folderStructure: Array<string>;
  if (fullPath) {
    folderStructure = (
      "files/" + path.replace(/\\/g, "/").split("files/")[1]
    ).split("/");
  } else {
    folderStructure = path.replace(/\\/g, "/").split("/");
  }

  const indexOfRaster = folderStructure
    .map((e) => e.toLowerCase())
    .indexOf("raster");
  const indexOfPoints = folderStructure
    .map((e) => e.toLowerCase())
    .indexOf("points");
  const indexOfAnalysis = folderStructure
    .map((e) => e.toLowerCase())
    .indexOf("analysis");

  const typeIndex = [indexOfRaster, indexOfPoints, indexOfAnalysis].find(
    (e) => e !== -1
  );

  if (!typeIndex || typeIndex === -1) {
    return null;
  }

  try {
    const customer = folderStructure[typeIndex - 2];
    const year = folderStructure[typeIndex - 1];
    const type = folderStructure[typeIndex];
    const dataset = folderStructure[typeIndex + 1];

    if (type.toLowerCase() === "raster") {
      return {
        customer,
        year,
        type: "raster",
        dataset,
        dir: folderStructure.slice(0, 5).join("/"),
      };
    }

    return null;
  } catch (error) {
    console.error(`[check-structure] couldn't parse path: ${path}`, error);
    return null;
  }
}
