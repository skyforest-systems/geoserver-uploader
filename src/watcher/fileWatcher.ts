import {
  acquireLock,
  checkIfFileAlreadyExists,
  getFile,
  releaseLock,
  saveFile,
} from "../repositories/db";
import { checkStructure } from "../utils/checkStructure";
import { hashFile } from "../utils/hashFile";

const LOCK_TTL_FOR_FILE_WATCHER = 60 * 60; // 1 hour

export async function fileWatcher(event: "add" | "change" | "unlink", path: string) {
  async function acquireFileWatcherLock(maxRetries = 10): Promise<boolean> {
    let attempts = 0;
    while (attempts < maxRetries) {
      const lock = await acquireLock(
        "fileWatcher::" + path,
        LOCK_TTL_FOR_FILE_WATCHER
      );
      if (lock) return true;

      attempts++;
      const delay = Math.random() * 100 * Math.pow(2, attempts);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
  }

  const lock = await acquireFileWatcherLock();

  if (!lock) {
    console.log(
      `[fileWatcher] could no aquire lock for ${path} after 10 attempts`
    );
    return;
  }

  try {
    console.log(`[fileWatcher] ${event} event detected for ${path}`);
    if (event === "add" || event === "change") {
      let now = new Date().getTime();

      const exists = await checkIfFileAlreadyExists(path);
      console.log(
        `[fileWatcher] this file already exists in database: ${path}`
      );

      const hash = await hashFile(path);
      if (!hash) {
        console.error(
          `[fileWatcher] couldn't hash file: ${path} (that took ${
            new Date().getTime() - now
          }ms)`
        );
        return;
      }

      if (exists) {
        console.log(`[fileWatcher] file already exists in database: ${path}`);
        const file = await getFile(path);

        if (!file) return;

        if (hash === file.hash && file.status === "done") {
          console.log(
            `[fileWatcher] file already processed and no changes detected: ${path}`
          );
        } else {
          console.log(
            `[fileWatcher] file's been updated - updating file status to queued: ${path}`
          );
          await saveFile({ ...file, hash, status: "queued" });
        }
      } else {
        const structure = await checkStructure(path);

        if (!structure) return;

        const basepath = structure.dir;

        console.log(`[fileWatcher] saving file: ${path}`);
        await saveFile({
          path,
          basepath,
          hash: hash,
          status: "queued",
          ts: new Date().getTime(),
        });
      }
    }

    if (event === "unlink") {
      const structure = await checkStructure(path, true);

      if (!structure) {
        console.log(`[fileWatcher] invalid structure for ${path}`);
        return;
      }
      const file = await getFile(path);
      console.log(`[fileWatcher] updating file status to removed: ${path}`);
      await saveFile({ ...file!, status: "removed" });
    }
  } catch (error) {
    console.error(`[fileWatcher] error:`, error);
  } finally {
    releaseLock("fileWatcher::" + path);
  }
}
