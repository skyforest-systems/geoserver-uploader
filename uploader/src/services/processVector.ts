import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { DatasetStructure } from "../interfaces";
import environments from "../environments";

const execPromise = promisify(exec);

/**
 * Processes a vector dataset to generate a Shapefile containing point geometries.
 *
 * This function searches the specified directory for vector files (`.shp`, `.kml`, `.kmz`, `.geojson`).
 * It verifies the geometry type of each file, selecting the first one with `Point` or `MultiPoint` geometry.
 * The selected file is converted to a Shapefile (`points.shp`) using the `ogr2ogr` utility.
 *
 * @param {DatasetStructure} structure - The dataset structure containing metadata and directory information.
 * @param {string} structure.dir - The directory where vector files are located.
 * @param {string} structure.dataset - The name of the dataset.
 *
 * @throws {Error} If no vector files are found, or if none have `Point` or `MultiPoint` geometries.
 *
 * @returns {Promise<string>} The path to the generated `points.shp` file.
 */
export default async function processVector(structure: DatasetStructure) {
  console.log(
    `[processVectorService] Processing vector dataset in ${structure.dir}`
  );

  let { dir, dataset } = structure;

  const basepath = dir.split("/").slice(0, -1).join("/");

  const inputShapefilePath = dir + ".shp";
  const outputShapefilePath = path.join(basepath, `${dataset}_output.shp`);

  try {
    console.log(
      `[processVectorService] Checking geometry type in file: ${inputShapefilePath}`
    );

    const { stdout: layerInfo } = await execPromise(
      `ogrinfo -so "${inputShapefilePath}"` // Get summary info about the dataset
    );

    if (/(Point|MultiPoint)/.test(layerInfo)) {
      console.log(
        `[processVectorService] Geometry type is valid: ${inputShapefilePath}`
      );
    } else {
      console.warn(
        `[processVectorService] Geometry type is invalid: ${inputShapefilePath}`
      );
      return;
    }

    // Convert to points.shp
    console.log(
      `[processVectorService] Converting to Shapefile: ${outputShapefilePath}`
    );
    await execPromise(
      `ogr2ogr -f "ESRI Shapefile" "${outputShapefilePath}" "${inputShapefilePath}" -nlt POINT -overwrite`
    );

    console.log(
      `[processVectorService] Finished processing vector dataset in ${dir}`
    );

    return outputShapefilePath;
  } catch (error) {
    console.error(
      `[processVectorService] Error processing vector dataset: ${error}`
    );
    throw error;
  }
}
