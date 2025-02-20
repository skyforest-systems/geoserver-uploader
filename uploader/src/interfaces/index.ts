export interface DatasetStructure {
  /** Customer name, indicates the first part of the workspace. Eg: customer_2024 */
  customer: string;
  /** Year of the dataset, indicates the second part of the workspace. Eg: skyforest_year */
  year: string;
  /** Type of the dataset, can be points, raster, analysis or styles */
  type: "points" | "raster" | "analysis" | "styles";
  /** Name of the dataset.
   * If a raster, it will be the name of the folder where the tiles are located.
   * If a points, it will be the name of the file, minus the extension.
   * If a analysis, it will be the name of the file.
   * If a styles, it will be the type of style and the name of the SLD file, for example: points/style.sld.
   */
  dataset: string;
  /** Path where the dataset is located.
   *
   * For rasters, it's the directory where the raster tiles are located inside the raster/ folder.
   * For points, it's the file name of the points file inside the points/ folder, minus the extension.
   * For analysis, it's the file name of the analysis file inside the analysis/ folder.
   * For styles, it's the file name of the SLD file inside the styles/points/ or styles/analysis/ folder.
   */
  dir: string;
}

export type DatasetQueueItem = {
  structure: DatasetStructure;
  hash: string;
};

export interface FileOnRedis {
  path: string;
  basepath: string;
  hash: string;
  status: "new" | "queued" | "processing" | "done" | "removed" | "ignored";
  ts: number;
  structure: DatasetStructure;
}
