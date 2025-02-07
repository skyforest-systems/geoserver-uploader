import { DatasetStructure } from "../interfaces";

export function checkStructure(
  path: string,
  fullPath?: boolean
): DatasetStructure | null {
  let folderStructure: Array<string>;
  if (fullPath) {
    folderStructure = (
      "files/" + path.replace(/\\/g, "/").split("files/")[1]
    ).split("/");
  } else {
    folderStructure = path.replace(/\\/g, "/").split("/");
  }

  try {
    const customer = folderStructure[1];
    const year = folderStructure[2];
    const type = folderStructure[3];
    const dataset = folderStructure[4];

    if (type.toLowerCase() === "raster") {
      return {
        customer,
        year,
        type: "raster",
        dataset,
        dir: folderStructure.slice(0, 5).join("/"),
      };
    } else if (type.toLowerCase() === "points") {
      return {
        customer,
        year,
        type: "points",
        dataset: dataset.split(".")[0],
        dir: folderStructure.slice(0, 5).join("/"),
      };
    } else if (type.toLowerCase() === "analysis") {
      return {
        customer,
        year,
        type: "analysis",
        dataset: dataset.split(".")[0],
        dir: folderStructure.slice(0, 5).join("/"),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[check-structure] couldn't parse path: ${path}`, error);
    return null;
  }
}
