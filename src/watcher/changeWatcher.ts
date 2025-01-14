import environments from "../environments";
import {
  acquireLock,
  getFilesByStatus,
  releaseLock,
  saveFile,
} from "../repositories/db";
import { hashDirectory } from "../utils/hashDirectory";

const LOCK_TTL_FOR_CHANGE_WATCHER = 60 * 60; // 1 hour

export async function changeWatcher(shouldLog: boolean = false) {
  try {
    const lock = await acquireLock(
      "changeWatcher",
      LOCK_TTL_FOR_CHANGE_WATCHER
    );
    if (!lock) return;

    const newFiles = await getFilesByStatus("new");

    if (newFiles.length === 0) {
      console.log(`[changeWatcher] no new files found`);
      return;
    }

    console.log(`[changeWatcher] detected ${newFiles.length} new files`);

    for (const file of newFiles) {
      shouldLog &&
        console.log(`[changeWatcher] new file detected: ${file.path}`);

      const hash = await hashDirectory(file.basepath, environments.extensions);

      if (!hash) {
        shouldLog &&
          console.error(
            `[changeWatcher] couldn't hash directory: ${file.basepath}`
          );
        continue;
      }

      if (file.hash === "") {
        await saveFile({ ...file, hash, status: "queued" });
      } else {
        if (hash === file.hash && file.status === "done") {
          shouldLog &&
            console.log(
              `[changeWatcher] file has not changed: ${file.path}, skipping`
            );
          saveFile({ ...file, status: "done" });
          continue;
        }
        await saveFile({ ...file, hash, status: "queued" });
      }
    }
  } catch (error) {
    console.error(`[changeWatcher] error:`, error);
  } finally {
    releaseLock("changeWatcher");
  }
}
