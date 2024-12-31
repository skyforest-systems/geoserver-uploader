import fs from "fs";
import path from "path";
import geoserver from "../repositories/geoserver";
import { DatasetStructure } from "../interfaces";

/**
 * Creates or updates a style in GeoServer based on an SLD file located in the specified directory.
 * If the style exists, updates it. If no SLD file is found, downloads the default point style from GeoServer, modifies it, and uploads it as a new style.
 *
 * @param {string} workspaceName - The name of the workspace in GeoServer.
 * @param {string} styleName - The name of the style to create or update.
 * @param {DatasetStructure} structure - The dataset structure containing directory information.
 * @param {string} structure.dir - The directory where the SLD file might be located.
 *
 * @throws {Error} If unable to create or update the style in GeoServer.
 *
 * @returns {Promise<string>} The name of the created or updated style.
 */
export async function createStyle(
  workspaceName: string,
  styleName: string,
  structure: DatasetStructure
) {
  const { dir } = structure;
  workspaceName = workspaceName.toLowerCase().replace(/ /g, "_");
  styleName = styleName.toLowerCase().replace(/ /g, "_");

  try {
    let sldContent;
    const sldFiles = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".sld"));

    if (sldFiles.length > 0) {
      // Use the first SLD file in the directory
      const sldFilePath = path.join(dir, sldFiles[0]);
      console.log(`[GeoServer] Using SLD file: ${sldFilePath}`);
      sldContent = fs.readFileSync(sldFilePath, "utf-8");
    } else {
      // Download the default point SLD from GeoServer
      console.log(
        `[GeoServer] No SLD file found. Fetching default point style.`
      );
      const defaultStyleResponse = await geoserver.get(
        `/rest/styles/point.sld`,
        { responseType: "text" }
      );

      sldContent = defaultStyleResponse.data;

      // Update the default SLD content with the new style name
      sldContent = sldContent.replace(
        /<sld:Name>.*?<\/sld:Name>/,
        `<sld:Name>${styleName}</sld:Name>`
      );
    }

    // Check if style exists
    console.log(`[GeoServer] Checking if style exists: ${styleName}`);
    try {
      await geoserver.get(
        `/rest/workspaces/${workspaceName}/styles/${styleName}`
      );
      // If no error is thrown, the style exists. Update it.
      console.log(`[GeoServer] Style exists. Updating: ${styleName}`);
      await geoserver.put(
        `/rest/workspaces/${workspaceName}/styles/${styleName}`,
        sldContent,
        {
          headers: {
            "Content-Type": "application/vnd.ogc.sld+xml",
          },
        }
      );
      console.log(`[GeoServer] Style updated: ${styleName}`);
    } catch (err) {}

    return styleName;
  } catch (error) {
    console.error(`[GeoServer] Error creating or updating style: ${error}`);
    throw error;
  }
}
