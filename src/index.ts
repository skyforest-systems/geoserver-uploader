import express, { Express, Request, Response } from "express";
import chokidar from "chokidar";
import { fileChangeController } from "./controllers/fileChangeController";
import { queueController } from "./controllers/queueController";
import dirRemovedController from "./controllers/dirRemovedController";
import { hashDirectory } from "./utils/hashDirectory";
import environments from "./environments";
import { getInitialState, saveInitialState } from "./repositories/db";
import { geoserverController } from "./controllers/geoserverController";

const app: Express = express();
const port = process.env.PORT || 2000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello there");
});

app.listen(port, async () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);

  const actualState =
    (await hashDirectory("./files", [
      ...environments.rasterExtensions,
      ...environments.pointsExtensions,
      ...environments.analysisExtensions,
    ])) || "";

  const lastState = await getInitialState();

  let mustCallController = actualState !== lastState;

  if (!mustCallController) {
    console.log(
      "[server] No changes since last initialization, skipping controller calls for first run"
    );
  }

  // Start file watcher
  const watcher = chokidar.watch("./files", {
    ignoreInitial: false, // Ensure all events including initial ones are detected
    persistent: true, // Keep watcher active
  });

  watcher
    .on("ready", async () => {
      console.log("[server] file watcher is ready, saving actual state");
      await saveInitialState(actualState);
      mustCallController = true; // Update mustCallController to enable detection
    })
    .on("all", async (event, path) => {
      if (event === "add" || event === "change" || event === "unlink") {
        if (mustCallController) {
          await fileChangeController(path, event);
        }
      }

      if (event === "unlinkDir" && mustCallController) {
        await dirRemovedController(path);
      }
    });

  // Run queueController every 5 seconds
  setInterval(() => {
    try {
      queueController();
    } catch (error) {
      console.error("Error in queueController:", error);
    }
  }, 5000);

  // Run geoserverController every 5 seconds
  setInterval(() => {
    try {
      geoserverController();
    } catch (error) {
      console.error("Error in queueController:", error);
    }
  }, 5000);
});
