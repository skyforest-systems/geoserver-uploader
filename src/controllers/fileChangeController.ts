import environments from "../environments";
import { removeDatasetFromList } from "../repositories/db";
import { enqueueDataset } from "../services/modificationQueue";
import { checkStructure } from "../utils/checkStructure";
import { hashDirectory } from "../utils/hashDirectory";

export async function fileChangeController(path: string, event: string) {
  try {
    const fileName = path.split("/").pop();
    const fileExtension = "." + fileName?.split(".").pop();
    const structure = checkStructure(path);

    if (!structure) {
      console.log(
        `[file-controller] structure in ${path} isnt valid. skipping...`
      );
      return;
    }

    let extensions;
    if (structure.type === "raster") extensions = environments.rasterExtensions;
    else if (structure.type === "points")
      extensions = environments.pointsExtensions;
    else if (structure.type === "analysis")
      extensions = environments.analysisExtensions;

    if (extensions?.includes(fileExtension!)) {
      const datasetHash = hashDirectory(structure.dir, extensions);

      if (!datasetHash) {
        console.log(
          `[file-controller] no files found in ${
            structure.dir
          } with the extensions: ${extensions.join(", ")}. Removing from list.`
        );
        await removeDatasetFromList(structure.dir);
        return;
      }

      enqueueDataset(structure, datasetHash);
      console.log(
        `[file-controller] file ${fileName} of ${structure.dataset} enqueued for modification analysis`
      );
    }
  } catch (error) {
    console.error(error);
  }
}
