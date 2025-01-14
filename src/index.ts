import express, { Express, Request, Response } from "express";
import chokidar from "chokidar";
import environments from "./environments";
import { fileWatcher } from "./watcher/fileWatcher";
import { changeWatcher } from "./watcher/changeWatcher";
import { queueWatcher } from "./watcher/queueWatcher";

const app: Express = express();
const port = process.env.PORT || 2000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello there");
});

app.listen(port, async () => {
  console.log(`[control] starting up...`);

  // Start file watcher
  const watcher = chokidar.watch("./files", {
    ignoreInitial: false,
    persistent: true,
  });

  let isChokidarReady = false;

  watcher
    .on("ready", async () => {
      console.log(
        "[control] first run done, file watcher is ready for new changes"
      );
      isChokidarReady = true;
    })
    .on("all", (event, path) => {
      // fileWatcher should be triggered only by add, change or deletion events
      if (!(event === "add" || event === "change" || event === "unlink"))
        return;

      // Files with '_output' on the name should not be considered as they are output from this very application
      if (path.includes("_output")) return;

      // Only consider files that are within the desired extensions
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
  }, 5000);

  setInterval(() => {
    queueWatcher();
  }, 5000);
});
