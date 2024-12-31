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
    `[process-vector-service] Processing vector dataset in ${structure.dir}`
  );

  const { dir, dataset } = structure;
  const outputShapefilePath = path.join(dir, "points.shp");

  try {
    // Find vector datasets in the directory
    const vectorFiles = fs
      .readdirSync(dir)
      .filter((file) =>
        environments.pointsExtensions.some((ext) =>
          file.toLowerCase().endsWith(ext)
        )
      )
      .sort();

    if (vectorFiles.length === 0) {
      throw new Error("No vector files found in the directory.");
    }

    let selectedFilePath = null;

    for (const file of vectorFiles) {
      const filePath = path.join(dir, file);
      console.log(
        `[process-vector-service] Checking geometry type in file: ${filePath}`
      );

      const { stdout: layerInfo } = await execPromise(
        `ogrinfo -so "${filePath}"` // Get summary info about the dataset
      );

      if (/(Point|MultiPoint)/.test(layerInfo)) {
        selectedFilePath = filePath;
        console.log(
          `[process-vector-service] Selected vector file with valid geometry: ${filePath}`
        );
        break;
      }
    }

    if (!selectedFilePath) {
      throw new Error(
        "No vector files with Point or MultiPoint geometries found in the directory."
      );
    }

    // Convert to points.shp
    console.log(
      `[process-vector-service] Converting to Shapefile: ${outputShapefilePath}`
    );
    await execPromise(
      `ogr2ogr -f "ESRI Shapefile" "${outputShapefilePath}" "${selectedFilePath}" -nlt POINT -overwrite`
    );

    console.log(
      `[process-vector-service] Finished processing vector dataset in ${dir}`
    );

    return outputShapefilePath;
  } catch (error) {
    console.error(
      `[process-vector-service] Error processing vector dataset: ${error}`
    );
    throw error;
  }
}
