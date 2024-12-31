import { z } from "zod";

// Define the schema for your environment variables
const EnvSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  GEOSERVER_URL: z.string().url().default("http://localhost:8080/geoserver"),
  GEOSERVER_USERNAME: z.string().default("admin"),
  GEOSERVER_PASSWORD: z.string().default("geoserver"),
  RASTER_EXTENSIONS: z
    .string()
    .transform((val) => val.split(","))
    .default(".jpg,.jpeg"),
  POINTS_EXTENSIONS: z
    .string()
    .transform((val) => val.split(","))
    .default(".geojson,.shp,.kml,.sld"),
  ANALYSIS_EXTENSIONS: z
    .string()
    .transform((val) => val.split(","))
    .default(".tif,.geotiff,.tiff"),
});

console.log(process.env);

// Parse and validate the environment variables
const parsedEnv = EnvSchema.parse(process.env);

// Convert the parsed environment variables to your desired format
const environments = {
  redisUrl: parsedEnv.REDIS_URL,
  geoserverUrl: parsedEnv.GEOSERVER_URL,
  geoserverUsername: parsedEnv.GEOSERVER_USERNAME,
  geoserverPassword: parsedEnv.GEOSERVER_PASSWORD,
  rasterExtensions: parsedEnv.RASTER_EXTENSIONS,
  pointsExtensions: parsedEnv.POINTS_EXTENSIONS,
  analysisExtensions: parsedEnv.ANALYSIS_EXTENSIONS,
};

export default environments;
