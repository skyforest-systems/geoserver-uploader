import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { DatasetStructure } from "../interfaces";

const execPromise = promisify(exec);

/**
 * Processes a single analysis TIF file in a specified directory.
 * Standardizes the TIF to EPSG:3006, applies compression, creates tiles,
 * and generates pyramids (overviews). If multiple TIF files are found, the function ignores them.
 *
 * @param {DatasetStructure} structure - The dataset structure containing directory information.
 * @param {string} structure.dir - The directory where the TIF file is located.
 *
 * @throws {Error} If no TIF files or more than one TIF file are found in the directory, or if processing fails.
 *
 * @returns {Promise<string>} The path of the processed TIF file.
 */
export default async function processAnalysis(structure: DatasetStructure) {
  console.log(
    `[process-analysis-service] Processing analysis TIF in ${structure.dir}`
  );

  const { dir } = structure;

  try {
    // Find all TIF files in the directory
    const tifFiles = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".tif"));

    if (tifFiles.length === 0) {
      throw new Error("No TIF files found in the directory.");
    }

    const inputTifPath = path.join(dir, tifFiles[0]);
    const outputTifPath = inputTifPath.split(".tif")[0] + "_output.tif"; // Output overwrites the input file

    console.log(
      `[process-analysis-service] Standardizing TIF file: ${inputTifPath}`
    );

    // Standardize the TIF to EPSG:3006 and apply compression
    await execPromise(
      `gdal_translate "${inputTifPath}" "${outputTifPath}" -a_srs EPSG:3006 -co COMPRESS=JPEG -co BIGTIFF=YES -co TILED=YES -co NUM_THREADS=8 -a_nodata 0`
    );

    console.log(
      `[process-analysis-service] Adding pyramids to TIF file: ${outputTifPath}`
    );

    // Add overviews to the TIF file
    await execPromise(
      `gdaladdo -r average "${outputTifPath}" --config GDAL_NUM_THREADS 8 --config BIGTIFF_OVERVIEW IF_NEEDED`
    );

    console.log(
      `[process-analysis-service] Finished processing analysis TIF: ${outputTifPath}`
    );

    return outputTifPath;
  } catch (error) {
    console.error(
      `[process-analysis-service] Error processing analysis TIF: ${error}`
    );
    throw error;
  }
}
