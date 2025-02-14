export interface RasterDatasetStructure {
  customer: string;
  year: string;
  type: "points" | "raster" | "analysis";
  dataset: string;
  dir: string;
}

export type DatasetQueueItem = {
  structure: RasterDatasetStructure;
  hash: string;
};

export interface FileOnRedis {
  path: string;
  basepath: string;
  hash: string;
  status: "new" | "queued" | "processing" | "done" | "removed";
  ts: number;
}
