import {
  addDatasetToProcessingQueue,
  checkIfDatasetIsNew,
  removeDatasetFromList,
} from "../repositories/db";
import { checkStructure } from "../utils/checkStructure";
import { hashDirectory } from "../utils/hashDirectory";

export async function fileChangeController(path: string, event: string) {
  try {
    const fileName = path.split("/").pop();
    const fileExtension = "." + fileName?.split(".").pop();
    const rasterExtensions = [".jpg", ".jpeg"];
    const pointsExtensions = [".geojson", ".shp", ".kml", ".kmz"];
    const analysisExtensions = [".tif", ".geotiff", ".tiff"];
    const structure = checkStructure(path);

    if (!structure) {
      console.log(
        `[file-controller] structure in ${path} isnt valid. skipping...`
      );
      return;
    }

    if (
      structure.type === "raster" &&
      rasterExtensions.includes(fileExtension!)
    ) {
      const rasterHash = hashDirectory(structure.dir, rasterExtensions);

      if (!rasterHash) {
        console.log(
          `[file-controller] no files found in ${
            structure.dir
          } with the extensions: ${rasterExtensions.join(
            `, `
          )}. Removing from list.`
        );
        removeDatasetFromList(structure.dir);
        return;
      }

      const isThisANewDataset = await checkIfDatasetIsNew(
        structure.dir,
        rasterHash
      );

      if (!isThisANewDataset) {
        console.log(
          `[file-controller] file ${fileName} of ${structure.dataset} already exists in the database`
        );
        return;
      }

      await addDatasetToProcessingQueue(structure, rasterHash);
      console.log(
        `[file-controller] file ${fileName} of ${structure.dataset} added to the queue`
      );
    } else if (
      structure.type === "points" &&
      pointsExtensions.includes(fileExtension!)
    ) {
      const pointsHash = hashDirectory(structure.dir, pointsExtensions);
      console.log("Points dataset added in: ", structure.dir, pointsHash);
    } else if (
      structure.type === "analysis" &&
      analysisExtensions.includes(fileExtension!)
    ) {
      const analysisHash = hashDirectory(structure.dir, analysisExtensions);
      console.log("Analysis dataset added in: ", structure.dir, analysisHash);
    }
  } catch (error) {
    console.error(error);
  }
}
