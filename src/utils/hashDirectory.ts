import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Readable } from "stream";

/**
 * Computes a SHA-256 hash for files in a directory or for a single file.
 * Uses streaming to handle large files efficiently.
 *
 * @param directoryOrFilePath - The path to either a file or directory.
 * @param extensions - The list of file extensions to include (e.g., [".jpg", ".jpeg"]).
 * @returns A Promise that resolves to the combined SHA-256 hash, or `null` if there are no matching files.
 */
export async function hashDirectory(
  directoryOrFilePath: string,
  extensions: string[],
  debug?: boolean
): Promise<string | null> {
  let now = new Date();
  if (debug) {
    debug && console.log(`[hashDirectory] Processing ${directoryOrFilePath}`);
  }
  const stats = fs.lstatSync(directoryOrFilePath, { throwIfNoEntry: false });
  const allFiles: string[] = [];

  debug &&
    console.log(
      `[hashDirectory] ${directoryOrFilePath} sync completed, that took ${
        new Date().getTime() - now.getTime()
      } ms`
    );
  if (!stats) {
    debug &&
      console.log(
        `[hashDirectory] ${directoryOrFilePath} does not exist, exiting...`
      );
    return null;
  }

  // Collects all matching files
  function walkDirectory(dir: string) {
    now = new Date();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    debug &&
      console.log(
        `[hashDirectory] Read ${dir}, that took ${
          new Date().getTime() - now.getTime()
        } ms`
      );
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.map((e) => e.toLowerCase()).includes(ext)) {
          debug &&
            console.log(
              `[hashDirectory] File ${fullPath} matches desired extensions`
            );
          allFiles.push(fullPath);
        }
      }
    }
  }

  if (stats.isDirectory()) {
    walkDirectory(directoryOrFilePath);
  } else if (stats.isFile()) {
    const ext = path.extname(directoryOrFilePath).toLowerCase();
    if (extensions.map((e) => e.toLowerCase()).includes(ext)) {
      allFiles.push(directoryOrFilePath);
    }
  }

  if (allFiles.length === 0) {
    debug &&
      console.log(
        `[hashDirectory] No matching files found in ${directoryOrFilePath}`
      );
    return null;
  }

  allFiles.sort(); // Ensure a consistent hashing order

  const globalHash = crypto.createHash("sha256");

  // Helper function to compute the hash of a single file
  async function computeFileHash(filePath: string): Promise<string> {
    now = new Date();
    return new Promise((resolve, reject) => {
      debug &&
        console.log(`[hashDirectory] Created read stream for ${filePath}`);
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk: Buffer) => hash.update(chunk));
      stream.on("end", () => {
        debug &&
          console.log(
            `[hashDirectory] Finished reading ${filePath}, that took ${
              new Date().getTime() - now.getTime()
            } ms`
          );
        return resolve(hash.digest("hex"));
      });
      stream.on("error", (err) => {
        debug &&
          console.log(
            `[hashDirectory] Error reading file ${filePath}: ${
              err.message
            }, that took ${new Date().getTime() - now.getTime()} ms`
          );
        return reject(
          new Error(`Error reading file ${filePath}: ${err.message}`)
        );
      });
    });
  }

  let i = 1;
  // Process each file sequentially to maintain a predictable hash order
  for (const filePath of allFiles) {
    debug &&
      console.log(
        `[hashDirectory] Processing file ${filePath} for hashing (${i}/${allFiles.length})`
      );
    const fileHash = await computeFileHash(filePath);
    globalHash.update(filePath); // Incorporate file path
    globalHash.update(fileHash); // Incorporate file hash
    i++;
  }

  return globalHash.digest("hex");
}
