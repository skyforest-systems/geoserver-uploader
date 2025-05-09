import { z } from 'zod'

// Define the schema for your environment variables
const EnvSchema = z.object({
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  GEOSERVER_URL: z.string().url().default('http://localhost:8080/geoserver'),
  GEOSERVER_USERNAME: z.string().default('admin'),
  GEOSERVER_PASSWORD: z.string().default('geoserver'),
  RASTER_EXTENSIONS: z
    .string()
    .transform((val) => val.split(','))
    .default('.jpg,.jpeg'),
  POINTS_EXTENSIONS: z
    .string()
    .transform((val) => val.split(','))
    .default('.shp,.shx,.prj'),
  ANALYSIS_EXTENSIONS: z
    .string()
    .transform((val) => val.split(','))
    .default('.tif,.geotiff,.tiff'),
  STYLES_EXTENSIONS: z
    .string()
    .transform((val) => val.split(','))
    .default('.sld'),
  DEBUG: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  FILE_ANALYSIS_WORKERS: z
    .string()
    .refine((val) => !Number.isNaN(parseInt(val, 10)), {
      message: 'Expected number, received a string',
    })
    .default('1'),
  FILE_PROCESSING_WORKERS: z
    .string()
    .refine((val) => !Number.isNaN(parseInt(val, 10)), {
      message: 'Expected number, received a string',
    })
    .default('1'),
})

// Parse and validate the environment variables
const parsedEnv = EnvSchema.parse(process.env)

// Convert the parsed environment variables to your desired format
const environments = {
  redisUrl: parsedEnv.REDIS_URL,
  redisHost: parsedEnv.REDIS_URL.split('redis://')[1].split(':')[0],
  redisPort: parsedEnv.REDIS_URL.split('redis://')[1].split(':')[1],
  geoserverUrl: parsedEnv.GEOSERVER_URL,
  geoserverUsername: parsedEnv.GEOSERVER_USERNAME,
  geoserverPassword: parsedEnv.GEOSERVER_PASSWORD,
  rasterExtensions: parsedEnv.RASTER_EXTENSIONS,
  pointsExtensions: parsedEnv.POINTS_EXTENSIONS,
  analysisExtensions: parsedEnv.ANALYSIS_EXTENSIONS,
  stylesExtensions: parsedEnv.STYLES_EXTENSIONS,
  extensions: parsedEnv.RASTER_EXTENSIONS.concat(parsedEnv.POINTS_EXTENSIONS)
    .concat(parsedEnv.ANALYSIS_EXTENSIONS)
    .concat(parsedEnv.STYLES_EXTENSIONS),
  debug: parsedEnv.DEBUG,
  fileanalysisWorkers: parseInt(parsedEnv.FILE_ANALYSIS_WORKERS),
  fileprocessingWorkers: parseInt(parsedEnv.FILE_PROCESSING_WORKERS),
}

export default environments
