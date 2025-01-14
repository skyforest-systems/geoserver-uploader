import { FileOnRedis } from "../interfaces";
import { acquireLock, getFilesByStatus, releaseLock } from "../repositories/db";
import processDataset from "../services/processDataset";
import { checkStructure } from "../utils/checkStructure";

const TIME_BETWEEN_CHECKS = 60 * 1000; // 1 minute
const LOCK_TTL_FOR_QUEUE_WATCHER = 12 * 60 * 60; // 12 hours
const LOCK_TTL_FOR_PROCESSING = 60 * 60; // 1 hour

export async function queueWatcher() {
  try {
    const lock = await acquireLock("queueWatcher", LOCK_TTL_FOR_QUEUE_WATCHER);
    if (!lock) return;
    const queuedFiles = await getFilesByStatus("queued");

    if (queuedFiles.length === 0) {
      console.log(`[queueWatcher] no queued files found`);
      return;
    }

    const filesByBasepath = queuedFiles.reduce(
      (acc: { [key: string]: FileOnRedis[] }, file: FileOnRedis) => {
        acc[file.basepath] = acc[file.basepath] || [];
        acc[file.basepath].push(file);
        return acc;
      },
      {}
    );

    console.log(
      `[queueWatcher] detected ${queuedFiles.length} files over ${
        Object.keys(filesByBasepath).length
      } datasets to process`
    );

    for (const basepath of Object.keys(filesByBasepath)) {
      const files = filesByBasepath[basepath].sort((a, b) => a.ts - b.ts);
      const oldestFile = files[0];
      const now = Date.now();

      if (now - oldestFile.ts > TIME_BETWEEN_CHECKS) {
        const lock = await acquireLock(
          `lock::${basepath}`,
          LOCK_TTL_FOR_PROCESSING
        );
        if (!lock) continue;

        console.log(`[queueWatcher] lock acquired: ${basepath}`);
        try {
          const structure = checkStructure(basepath);
          if (!structure) {
            console.warn(`[queueWatcher] invalid structure for ${basepath}`);
            continue;
          }
          await processDataset(basepath, structure);
        } catch (error) {
          console.error(`[queueWatcher] error for dataset ${basepath}:`, error);
        } finally {
          await releaseLock(`lock::${basepath}`);
          console.log(`[queueWatcher] lock released: ${basepath}`);
        }
      } else {
        console.log(
          `[queueWatcher] dataset ignored: ${basepath}, ready in ${
            (oldestFile.ts + TIME_BETWEEN_CHECKS - now) / 1000
          }s`
        );
      }
    }
  } catch (error) {
    console.error(`[queueWatcher] error:`, error);
  } finally {
    releaseLock("queueWatcher");
  }
}
