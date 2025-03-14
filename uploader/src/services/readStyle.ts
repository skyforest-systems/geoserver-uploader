import { DatasetStructure } from '../interfaces'
import * as fs from 'fs'

export default function readStyle(structure: DatasetStructure) {
  try {
    const style = fs.readFileSync(structure.dir, 'utf-8')
    return style
  } catch (error) {
    throw error
  }
}
