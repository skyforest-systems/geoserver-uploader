import { createClient } from "redis";
import { DatasetQueueItem, DatasetStructure } from "../interfaces";
import {
  addDatasetsToProcessingQueue,
  checkIfDatasetIsNew,
} from "../repositories/db";

const queue: DatasetQueueItem[] = [];
let processing = false;

export const enqueueDataset = (structure: DatasetStructure, hash: string) => {
  queue.push({ structure, hash });
  debounceProcessQueue();
};

const debounceProcessQueue = (() => {
  let timer: NodeJS.Timeout | null = null;

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => processQueue(), 5000);
  };
})();

const processQueue = async () => {
  console.log(`[processQueue] Processing queue...`);
  if (processing) return; // Avoid concurrent processing

  processing = true;

  try {
    const batch = [...queue];
    queue.length = 0; // Clear the queue

    // Check which datasets are new and add them in batches
    const newDatasets = await Promise.all(
      batch.map(async ({ structure, hash }) => {
        // console.log("[debug] checkIfDatasetIsNew", structure.dir, hash);
        const isNew = await checkIfDatasetIsNew(structure.dir, hash);
        return isNew ? { structure, hash } : null;
      })
    );

    const datasetsToAdd = newDatasets.filter(Boolean) as DatasetQueueItem[];
    if (datasetsToAdd.length > 0) {
      console.log(
        `[processQueue] Adding ${datasetsToAdd.length} modifications to processing queue:`
      );
      await addDatasetsToProcessingQueue(datasetsToAdd);
      console.log(
        `[processQueue] Processed ${datasetsToAdd.length} modifications.`
      );
    } else {
      console.log(`[processQueue] No new modifications to process.`);
    }
  } catch (error) {
    console.error(`[processQueue] Error: ${error}`);
  } finally {
    processing = false;
  }
};
