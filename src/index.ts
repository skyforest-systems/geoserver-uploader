import express, { Express, Request, Response } from "express";
import chokidar from "chokidar";
import environments from "./environments";
import { fileWatcher } from "./watcher/fileWatcher";
import { changeWatcher } from "./watcher/changeWatcher";
import { queueWatcher } from "./watcher/queueWatcher";
import countTotalFiles from "./services/countTotalFiles";
import { geoserverWatcher } from "./watcher/geoserverWatcher";
import { releaseAllLocks } from "./repositories/db";

const app: Express = express();
const port = process.env.PORT || 2000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello there");
});

app.listen(port, async () => {
  console.log(`[control] starting up...`);

  releaseAllLocks();

  const folderPath = "./files";
  const totalFiles = countTotalFiles(folderPath);
  let processedFiles = 0;
  let startTime: number | null = null;

  console.log(`[control] found ${totalFiles} files in the folder.`);

  if (totalFiles > 0) {
    startTime = Date.now();
  } else {
    console.log("[control] no files found in the folder.");
  }

  // Start file watcher
  const watcher = chokidar.watch(folderPath, {
    ignoreInitial: false,
    persistent: true,
  });

  let isChokidarReady = false;

  watcher
    .on("add", () => {
      if (!isChokidarReady) {
        processedFiles++;
        const elapsedTime = (Date.now() - (startTime || 0)) / 1000; // in seconds
        const eta = processedFiles
          ? Math.round(
              ((totalFiles - processedFiles) * elapsedTime) / processedFiles
            )
          : 0;

        console.log(
          `[control] first run progress: ${processedFiles}/${totalFiles} (${
            parseInt(String((processedFiles / totalFiles) * 10000)) / 100
          }%) files processed. ETA: ${eta}s`
        );
      }
    })
    .on("ready", async () => {
      console.log(
        "[control] first run done, file watcher is ready for new changes."
      );
      isChokidarReady = true;
    })
    .on("all", (event, path) => {
      // fileWatcher should be triggered only by add, change, or deletion events
      if (!(event === "add" || event === "change" || event === "unlink"))
        return;

      // Skip files with '_output' in the name
      if (path.includes("_output")) return;

      // Only consider files with the desired extensions
      const fileExtension = "." + path.split(".").pop();
      if (
        !(
          environments.analysisExtensions.includes(fileExtension) ||
          environments.pointsExtensions.includes(fileExtension) ||
          environments.rasterExtensions.includes(fileExtension)
        )
      )
        return;
      fileWatcher(event, path, isChokidarReady);
    });

  setInterval(() => {
    isChokidarReady && changeWatcher();
  }, 5 * 1000);

  setInterval(() => {
    isChokidarReady && queueWatcher();
  }, 5 * 1000);

  setInterval(() => {
    isChokidarReady && geoserverWatcher();
  }, 10 * 60 * 1000);
});
