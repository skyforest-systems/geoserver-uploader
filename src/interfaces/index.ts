export interface DatasetStructure {
  customer: string;
  year: string;
  type: "points" | "raster" | "analysis";
  dataset: string;
  dir: string;
}
