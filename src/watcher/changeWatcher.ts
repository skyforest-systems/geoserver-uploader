import environments from "../environments";
import { getFilesByStatus, saveFile } from "../repositories/db";
import { hashDirectory } from "../utils/hashDirectory";

export async function changeWatcher(shouldLog: boolean = false) {
  try {
    const newFiles = await getFilesByStatus("new");

    if (newFiles.length === 0) return;

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
  }
}
