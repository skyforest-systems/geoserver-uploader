import fs from "fs";
import path from "path";

export default function countTotalFiles(dir: string): number {
  let fileCount = 0;

  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      // Recursively count files in subdirectories
      fileCount += countTotalFiles(fullPath);
    } else if (file.isFile()) {
      fileCount++;
    }
  });

  return fileCount;
}
