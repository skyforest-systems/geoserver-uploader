import fs from "fs";
import path from "path";
import geoserver from "../repositories/geoserver";
import { DatasetStructure } from "../interfaces";
import { createStyle } from "./createStyle";

/**
 * Downloads the default point style from GeoServer, modifies it, and uploads it as a new style.
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
export async function createDefaultStyle(
  workspaceName: string,
  styleName: string,
  structure: DatasetStructure
) {
  const { dir } = structure;
  workspaceName = workspaceName.toLowerCase().replace(/ /g, "_");
  styleName = styleName.toLowerCase().replace(/ /g, "_");

  try {
    let sldContent;

    // Download the default point SLD from GeoServer
    const defaultStyleResponse = await geoserver.get(`/rest/styles/point.sld`, {
      responseType: "text",
    });

    sldContent = defaultStyleResponse.data;

    // Update the default SLD content with the new style name
    sldContent = sldContent.replace(
      /<sld:Name>.*?<\/sld:Name>/,
      `<sld:Name>${styleName}</sld:Name>`
    );

    const style = await createStyle(
      workspaceName,
      styleName,
      structure,
      sldContent
    );
    return style;
  } catch (error) {
    console.error(`[GeoServer] Error creating or updating style: ${error}`);
    throw error;
  }
}
