import environments from "../environments";
import {
  acquireLock,
  getFilesByStatus,
  releaseLock,
  saveFile,
} from "../repositories/db";
import { hashFile } from "../utils/hashFile";

const LOCK_TTL_FOR_CHANGE_WATCHER = 60 * 60; // 1 hour

export async function changeWatcher() {
  // console.log(`[changeWatcher] aquiring lock`);
  const lock = await acquireLock("changeWatcher", LOCK_TTL_FOR_CHANGE_WATCHER);
  if (!lock) {
    // console.log(`[changeWatcher] lock held by another process`);
    return;
  }

  try {
    // console.log(`[changeWatcher] lock acquired`);
    // console.log(`[changeWatcher] checking for new files`);
    const newFiles = await getFilesByStatus("new");

    if (newFiles.length === 0) {
      console.log(`[changeWatcher] no new files found`);
      return;
    }

    console.log(`[changeWatcher] detected ${newFiles.length} new files`);

    for (const file of newFiles) {
      let now = new Date().getTime();
      // console.log(`[changeWatcher] hashing this file: ${file.path}`);

      const hash = await hashFile(file.path);

      if (!hash) {
        console.error(
          `[changeWatcher] couldn't hash file: ${file.path} (that took ${
            new Date().getTime() - now
          }ms)`
        );
        continue;
      }

      // console.log(
      //   `[changeWatcher] finished hashing ${file.path} (that took ${
      //     new Date().getTime() - now
      //   }ms)`
      // );

      if (file.hash === "") {
        now = new Date().getTime();
        // console.log(`[changeWatcher] file is new, saving to db `);
        await saveFile({ ...file, hash, status: "queued" });
        // console.log(
        //   `[changeWatcher] finished saving to db (that took ${
        //     new Date().getTime() - now
        //   }ms)`
        // );
      } else {
        now = new Date().getTime();
        if (hash === file.hash && file.status === "done") {
          // console.log(
          //   `[changeWatcher] file has not changed: ${
          //     file.path
          //   }, saving status DONE to db (that took ${
          //     new Date().getTime() - now
          //   }ms)`
          // );
          saveFile({ ...file, status: "done" });
          // console.log(
          //   `[changeWatcher] finished saving to db (that took ${
          //     new Date().getTime() - now
          //   }ms)`
          // );
          continue;
        }
        // console.log(
        //   `[changeWatcher] file has changed: ${file.path}, saving it to db`
        // );
        await saveFile({ ...file, hash, status: "queued" });

        // console.log(
        //   `[changeWatcher] finished saving to db (that took ${
        //     new Date().getTime() - now
        //   }ms)`
        // );
      }
    }
  } catch (error) {
    console.error(`[changeWatcher] error:`, error);
  } finally {
    releaseLock("changeWatcher");
  }
}
