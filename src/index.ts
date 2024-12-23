import express, { Express, Request, Response } from "express";
import chokidar from "chokidar";
import { fileChangeController } from "./controllers/fileChangeController";
import { queueController } from "./controllers/queueController";
import dirRemovedController from "./controllers/dirRemovedController";

const app: Express = express();
const port = process.env.PORT || 2000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello there");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);

  // start file watcher
  chokidar.watch("./files").on("all", (event, path) => {
    if (event === "add" || event === "change" || event === "unlink") {
      fileChangeController(path, event);
    }

    if (event === "unlinkDir") {
      dirRemovedController(path);
    }
  });

  // run queueController every 5 seconds
  setInterval(() => {
    try {
      queueController();
    } catch (error) {
      console.error("Error in queueController:", error);
    }
  }, 5000);
});
