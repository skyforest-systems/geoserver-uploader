import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Computes a SHA-256 hash. If the path is:
 *   - a directory: recursively hashes all matching files inside.
 *   - a file: hashes that single file (if it matches).
 *
 * @param directoryOrFilePath - The path to either a file or directory.
 * @param extensions - The list of file extensions to include (e.g., [".jpg", ".jpeg"]).
 * @returns The combined SHA-256 hash, or `null` if there are no matching files.
 */
export function hashDirectory(
  directoryOrFilePath: string,
  extensions: string[]
): string | null {
  const stats = fs.lstatSync(directoryOrFilePath, {
    throwIfNoEntry: false,
  });
  const allFiles: string[] = [];

  if (!stats) {
    return null;
  }

  /**
   * Recursively walks through a directory, collecting
   * files that match the desired extensions.
   */
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

  // Check if the path is a directory or a file
  if (stats.isDirectory()) {
    walkDirectory(directoryOrFilePath);
  } else if (stats.isFile()) {
    const ext = path.extname(directoryOrFilePath).toLowerCase();
    if (extensions.map((e) => e.toLowerCase()).includes(ext)) {
      allFiles.push(directoryOrFilePath);
    }
  }

  // If there's no matching files, return null
  if (allFiles.length === 0) {
    return null;
  }

  // Sort files for deterministic hashing order
  allFiles.sort();

  // Create a global hash to combine all individual file hashes
  const globalHash = crypto.createHash("sha256");

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath);
    const fileHash = crypto.createHash("sha256").update(content).digest("hex");

    // Incorporate the file path and its hash into the global hash
    globalHash.update(filePath);
    globalHash.update(fileHash);
  }

  return globalHash.digest("hex");
}
