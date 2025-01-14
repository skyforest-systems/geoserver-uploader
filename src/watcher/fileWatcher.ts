import {
  checkIfFileAlreadyExists,
  getFile,
  saveFile,
} from "../repositories/db";
import { checkStructure } from "../utils/checkStructure";

export async function fileWatcher(
  event: "add" | "change" | "unlink",
  path: string,
  shouldLog: boolean = false
) {
  try {
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
  } catch (error) {}
}
