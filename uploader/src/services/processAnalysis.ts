import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { DatasetStructure } from '../interfaces'

const execPromise = promisify(exec)

export default async function processAnalysis(structure: DatasetStructure) {
  console.log(
    `[process-analysis-service] processing analysis dataset in ${structure.dir}`
  )

  const { dir, dataset } = structure
  const inputPath = path.join(dir, structure.dataset + '.tif')
  const tifPath = path.join(dir, structure.dataset + '_output.tif')
  const fileListPath = path.join(dir, 'file_list.txt')

  try {
    console.log(`[process-analysis-service] Generating TIF file: ${tifPath}`)
    await execPromise(
      `gdal_translate "${inputPath}" "${tifPath}" -a_srs EPSG:3006 -co COMPRESS=JPEG -co PHOTOMETRIC=YCBCR -co BIGTIFF=YES -co TILED=YES -co NUM_THREADS=8 -a_nodata 0`
    )

    console.log(
      `[process-analysis-service] Adding overviews to TIF file: ${tifPath}`
    )
    await execPromise(
      `gdaladdo -r average "${tifPath}" --config GDAL_NUM_THREADS 8 --config BIGTIFF_OVERVIEW IF_NEEDED`
    )

    console.log(
      `[process-analysis-service] Finished processing analysis dataset in ${dir}`
    )

    return tifPath
  } catch (error) {
    console.error(
      `[process-analysis-service] Error processing analysis dataset: ${error}`
    )
    throw error
  } finally {
    // Cleanup temporary files
    if (fs.existsSync(fileListPath)) {
      fs.unlinkSync(fileListPath)
    }
  }
}
