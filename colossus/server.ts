import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { URL } from "url";
import render401 from "./401";
import morgan from "morgan";
import apicache from "apicache";

const app = express();
const PORT = process.env.PORT || 3000;
const GEOSERVER_URL =
  process.env.GEOSERVER_URL || "https://map.skyforest.se/geoserver";

// Setup logging
app.use(morgan(":date[iso] :method :url :status - :response-time ms"));

// Initialize cache (10 minutes)
const cache = apicache.middleware("10 minutes");

// Proxy Middleware
app.use("/:geoserverPath(*)", cache, (req: Request, res: Response, next) => {
  const originalUrl = new URL(
    req.protocol + "://" + req.get("host") + req.originalUrl,
  );
  const geoserverPath = req.params.geoserverPath;
  const username = originalUrl.searchParams.get("username");
  const password = originalUrl.searchParams.get("password");

  if (!username || !password) {
    res
      .status(401)
      .send(
        render401(
          `https://map.skyforest.se/geoserver/${geoserverPath}${originalUrl.search}`,
        ),
      );
    return;
  }

  // Remove username and password from query params
  originalUrl.searchParams.delete("username");
  originalUrl.searchParams.delete("password");

  console.log(
    `[${new Date().toISOString()}] [PROXY] Forwarding to ${GEOSERVER_URL}/${geoserverPath}${
      originalUrl.search
    }`,
  );

  // Encode credentials in Basic Auth format
  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString(
    "base64",
  )}`;

  const proxy = createProxyMiddleware({
    target: GEOSERVER_URL,
    changeOrigin: true,
    selfHandleResponse: false,
    headers: {
      Authorization: authHeader,
    },
    pathRewrite: (path, req) => {
      return `/${geoserverPath}${
        req.url!.split("?")[1] ? "?" + req.url!.split("?")[1] : ""
      }`;
    },
  });

  proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(
    `[${new Date().toISOString()}] Server running on http://localhost:${PORT} and proxying requests to ${GEOSERVER_URL}`,
  );
});
