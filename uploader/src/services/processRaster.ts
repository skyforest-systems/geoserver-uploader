import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { DatasetStructure } from '../interfaces'

const execPromise = promisify(exec)

export default async function processRaster(structure: DatasetStructure) {
  console.log(
    `[process-raster-service] processing raster dataset in ${structure.dir}`
  )

  const { dir, dataset } = structure
  const vrtPath = path.join(dir, 'raster_output.vrt')
  const tifPath = path.join(dir, 'raster_output.tif')
  const fileListPath = path.join(dir, 'file_list.txt')

  try {
    // 1. Find all JPG files and write to file_list.txt
    const jpgFiles = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith('.jpg'))
      .map((file) => path.join(dir, file))

    if (jpgFiles.length === 0) {
      throw new Error('No JPG files found in the directory.')
    }

    fs.writeFileSync(fileListPath, jpgFiles.join('\n'))

    console.log(
      `[process-raster-service] Found ${jpgFiles.length} JPG files in ${dir}`
    )

    // 2. Generate the VRT file
    console.log(`[process-raster-service] Generating VRT file: ${vrtPath}`)
    await execPromise(
      `gdalbuildvrt "${vrtPath}" -input_file_list "${fileListPath}"`
    )

    // 3. Generate the TIF file
    console.log(`[process-raster-service] Generating TIF file: ${tifPath}`)
    await execPromise(
      `gdal_translate "${vrtPath}" "${tifPath}" -a_srs EPSG:3006 -co COMPRESS=JPEG -co PHOTOMETRIC=YCBCR -co BIGTIFF=YES -co TILED=YES -co NUM_THREADS=8 -a_nodata 0`
    )

    // 4. Add overviews to the TIF file
    console.log(
      `[process-raster-service] Adding overviews to TIF file: ${tifPath}`
    )
    await execPromise(
      `gdaladdo -r average "${tifPath}" --config GDAL_NUM_THREADS 8 --config BIGTIFF_OVERVIEW IF_NEEDED`
    )

    console.log(
      `[process-raster-service] Finished processing raster dataset in ${dir}`
    )

    return tifPath
  } catch (error) {
    console.error(
      `[process-raster-service] Error processing raster dataset: ${error}`
    )
    throw error
  } finally {
    // Cleanup temporary files
    if (fs.existsSync(fileListPath)) {
      fs.unlinkSync(fileListPath)
    }
  }
}
