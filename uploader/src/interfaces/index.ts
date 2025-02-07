export interface DatasetStructure {
  customer: string;
  year: string;
  type: "points" | "raster" | "analysis";
  dataset: string;
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
  status: "new" | "queued" | "processing" | "done" | "removed";
  ts: number;
}