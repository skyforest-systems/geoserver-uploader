import { DatasetStructure } from '../interfaces'
import * as fs from 'fs'
import path from 'path'
import environments from '../config/environments'

export function checkStructure(
  origin: string,
  isUnlink?: boolean
): DatasetStructure | null {
  const BASEPATH = 'files'
  let folderStructure = origin.replace(/\\/g, '/').split('/')

  origin = origin.toLowerCase()

  if (isUnlink) {
    const baseIndex = folderStructure.indexOf(BASEPATH)
    if (baseIndex !== -1) {
      folderStructure = folderStructure.slice(baseIndex)
    }
  }

  const indexOfRaster = folderStructure.findIndex(
    (e) => e.toLowerCase() === 'raster'
  )
  const indexOfPoints = folderStructure.findIndex(
    (e) => e.toLowerCase() === 'points'
  )
  const indexOfAnalysis = folderStructure.findIndex(
    (e) => e.toLowerCase() === 'analysis'
  )
  const indexOfStyles = folderStructure.findIndex(
    (e) => e.toLowerCase() === 'styles'
  )

  let typeIndex = origin.includes('styles')
    ? indexOfStyles
    : [indexOfRaster, indexOfPoints, indexOfAnalysis].find((e) => e !== -1)

  if (typeIndex === undefined || typeIndex === -1) {
    return null
  }

  try {
    if (folderStructure.length <= typeIndex + 1) return null

    const customer = folderStructure[typeIndex - 2]
    const year = folderStructure[typeIndex - 1]
    const type = folderStructure[typeIndex] as DatasetStructure['type']

    let dataset = folderStructure[typeIndex + 1]

    if (type.toLowerCase() === 'raster') {
      const dir = [BASEPATH, customer, year, type, dataset].join('/')

      if (!folderStructure.join('/').startsWith(dir)) {
        throw new Error(
          `Invalid folder structure for ${origin}, expected ${dir}`
        )
      }

      if (!isUnlink && fs.existsSync(dir) && !fs.lstatSync(dir).isDirectory()) {
        console.warn(
          `Invalid file structure for ${dir}, expected a folder, but it's a file`
        )
        return null
      }

      return { customer, year, type: 'raster', dataset, dir }
    }

    if (type.toLowerCase() === 'points' || type.toLowerCase() === 'analysis') {
      if (!dataset.includes('.')) return null

      const [datasetName, extension] = dataset.split('.')

      if (
        type.toLowerCase() === 'points' &&
        !environments.pointsExtensions.includes(`.${extension}`)
      )
        return null
      if (
        type.toLowerCase() === 'analysis' &&
        !environments.analysisExtensions.includes(`.${extension}`)
      )
        return null

      const dir = [BASEPATH, customer, year, type, datasetName].join('/')

      if (
        !isUnlink &&
        fs.existsSync(path.join(dir + `.${extension}`)) &&
        fs.lstatSync(path.join(dir + `.${extension}`)).isDirectory()
      ) {
        console.warn(
          `Invalid file structure for ${dir}, expected a file, but it's a folder`
        )
        return null
      }

      if (!folderStructure.join('/').startsWith(dir)) {
        throw new Error(
          `Invalid folder structure for ${origin}, expected ${dir}`
        )
      }

      return { customer, year, type, dataset: datasetName, dir }
    }

    if (type.toLowerCase() === 'styles') {
      const styleType = folderStructure[typeIndex + 1]
      if (!styleType || folderStructure.length <= typeIndex + 2) return null

      dataset = [styleType, folderStructure[typeIndex + 2]].join('/')

      const dir = [BASEPATH, customer, year, type, dataset].join('/')

      if (!folderStructure.join('/').startsWith(dir)) {
        throw new Error(
          `Invalid folder structure for ${origin}, expected ${dir}`
        )
      }

      if (!isUnlink && fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
        console.warn(
          `[check-structure] Invalid file structure for ${dir}, expected a file, but it's a folder`
        )
        return null
      }

      return { customer, year, type: 'styles', dataset, dir }
    }

    return null
  } catch (error) {
    console.error(`[check-structure] couldn't parse path: ${origin}`, error)
    return null
  }
}
