import { DatasetStructure } from '../interfaces'
import * as fs from 'fs'
import path from 'path'
import environments from '../environments'

export function checkStructure(
  origin: string,
  isUnlink?: boolean
): DatasetStructure | null {
  const structure = () => {
    const BASEPATH = 'files'

    let folderStructure: Array<string>
    if (isUnlink) {
      folderStructure = (
        BASEPATH +
        '/' +
        origin.replace(/\\/g, '/').split(BASEPATH + '/')[1]
      ).split('/')
    } else {
      folderStructure = origin.replace(/\\/g, '/').split('/')
    }

    const indexOfRaster = folderStructure
      .map((e) => e.toLowerCase())
      .indexOf('raster')
    const indexOfPoints = folderStructure
      .map((e) => e.toLowerCase())
      .indexOf('points')
    const indexOfAnalysis = folderStructure
      .map((e) => e.toLowerCase())
      .indexOf('analysis')
    const indexOfStyles = folderStructure
      .map((e) => e.toLowerCase())
      .indexOf('styles')

    let typeIndex

    if (origin.includes('styles')) typeIndex = indexOfStyles
    else {
      typeIndex = [indexOfRaster, indexOfPoints, indexOfAnalysis].find(
        (e) => e !== -1
      )
    }

    if (!typeIndex || typeIndex === -1) {
      return null
    }

    try {
      const customer = folderStructure[typeIndex - 2]
      const year = folderStructure[typeIndex - 1]
      const type = folderStructure[typeIndex]

      // folder structure for rasters:
      // <custome>/<year>/raster/<dataset>/<file>
      if (type.toLowerCase() === 'raster') {
        const dataset = folderStructure[typeIndex + 1]
        const dir = [BASEPATH, customer, year, type, dataset].join(`/`)

        if (!folderStructure.join(`/`).includes(dir))
          throw new Error(
            `Invalid folder structure for ${origin}, expected ${dir}`
          )

        // skips the isFolder check if isUnlink is provided, since the file wont exist to be checked
        if (!isUnlink) {
          const isFolder = fs.lstatSync(dir).isDirectory()

          if (!isFolder) {
            console.warn(
              `Invalid file structure for ${dir}, expected a folder, but it's a file`
            )
            return null
          }
        }

        return {
          customer,
          year,
          type: 'raster',
          dataset,
          dir: dir,
        }
      }

      // folder structure for points:
      // <customer>/<year>/points/<dataset>
      // in that case, the dataset is the name of the file minus the extension
      // since a shapefile will have multiple files with the same name but different
      // extensions
      if (type.toLowerCase() === 'points') {
        const dataset = folderStructure[typeIndex + 1].split('.')[0]
        const extension = `.` + folderStructure[typeIndex + 1].split('.')[1]

        if (!environments.pointsExtensions.includes(extension)) {
          console.warn(
            `[check-structure] Invalid file extension for ${origin}, expected one of ${environments.pointsExtensions.join(
              ', '
            )}`
          )
          return null
        }

        const dir = [BASEPATH, customer, year, type, dataset].join(`/`)

        // skips the isFolder check if isUnlink is provided, since the file wont exist to be checked
        if (!isUnlink) {
          const isFolder = fs
            .lstatSync(path.join(dir + extension))
            .isDirectory()

          if (isFolder) {
            console.warn(
              `Invalid file structure for ${dir}, expected a file, but it's a folder`
            )
            return null
          }
        }

        if (!folderStructure.join(`/`).includes(path.join(dir)))
          throw new Error(
            `Invalid folder structure for ${origin}, expected ${dir}`
          )

        return {
          customer,
          year,
          type: 'points',
          dataset,
          dir: dir,
        }
      }

      // folder structure for styles can be either:
      // - <customer>/<year>/styles/points/<dataset>
      // - <customer>/<year>/styles/analysis/<dataset>
      // the dataset is always the name of the SLD file with the extension
      if (type.toLowerCase() === 'styles') {
        const styleType = folderStructure[typeIndex + 1]
        const dataset = [styleType, folderStructure[typeIndex + 2]].join(`/`)
        const dir = [BASEPATH, customer, year, type, dataset].join(`/`)

        if (!folderStructure.join(`/`).includes(dir))
          throw new Error(
            `Invalid folder structure for ${origin}, expected ${dir}`
          )

        // skips the isFolder check if isUnlink is provided, since the file wont exist to be checked
        if (!isUnlink) {
          const isFolder = fs.lstatSync(path.join(dir)).isDirectory()

          if (isFolder) {
            console.warn(
              `[check-structure] Invalid file structure for ${dir}, expected a file, but it's a folder`
            )
            return null
          }
        }

        return {
          customer,
          year,
          type: 'styles',
          dataset,
          dir: dir,
        }
      }

      return null
    } catch (error) {
      console.error(`[check-structure] couldn't parse path: ${origin}`, error)
      return null
    }
  }
  // console.log(`[check-structure] structure:`, structure())
  return structure() as DatasetStructure | null
}
