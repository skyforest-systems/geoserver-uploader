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
  extensions: string[]
): Promise<string | null> {
  const stats = fs.lstatSync(directoryOrFilePath, { throwIfNoEntry: false });
  const allFiles: string[] = [];

  if (!stats) {
    return null;
  }

  // Collects all matching files
  function walkDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDirectory(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.map((e) => e.toLowerCase()).includes(ext)) {
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
    return null;
  }

  allFiles.sort(); // Ensure a consistent hashing order

  const globalHash = crypto.createHash("sha256");

  // Helper function to compute the hash of a single file
  async function computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk: Buffer) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", (err) =>
        reject(new Error(`Error reading file ${filePath}: ${err.message}`))
      );
    });
  }

  // Process each file sequentially to maintain a predictable hash order
  for (const filePath of allFiles) {
    const fileHash = await computeFileHash(filePath);
    globalHash.update(filePath); // Incorporate file path
    globalHash.update(fileHash); // Incorporate file hash
  }

  return globalHash.digest("hex");
}
