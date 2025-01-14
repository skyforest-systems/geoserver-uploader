import {
  acquireLock,
  checkIfFileAlreadyExists,
  getFile,
  releaseLock,
  saveFile,
} from "../repositories/db";
import { checkStructure } from "../utils/checkStructure";

const LOCK_TTL_FOR_FILE_WATCHER = 20 * 60; // 20 minutes

export async function fileWatcher(
  event: "add" | "change" | "unlink",
  path: string,
  shouldLog: boolean = false
) {
  try {
    const lock = await acquireLock("fileWatcher", LOCK_TTL_FOR_FILE_WATCHER);
    if (!lock) return;

    shouldLog &&
      console.log(`fileWatcher triggered for ${event} event on ${path}`);
    if (event === "add" || event === "change") {
      const exists = await checkIfFileAlreadyExists(path);

      if (exists) {
        const file = await getFile(path);

        await saveFile({ ...file!, status: "new" });
      } else {
        const structure = await checkStructure(path);

        if (!structure) return;

        const basepath = structure.dir;

        await saveFile({
          path,
          basepath,
          hash: "",
          status: "new",
          ts: new Date().getTime(),
        });
      }
    }

    if (event === "unlink") {
      const file = await getFile(path);

      await saveFile({ ...file!, status: "removed" });
    }
  } catch (error) {
    console.error(`[fileWatcher] error:`, error);
  } finally {
    releaseLock("fileWatcher");
  }
}
