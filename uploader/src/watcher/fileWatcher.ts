import { readdir, stat } from 'fs/promises'
import path from 'path'
import EventEmitter from 'events'
import { Dirent } from 'fs'
import { acquireLock, releaseLock } from '../repositories/db'

const DEFAULT_SCAN_INTERVAL = 60 * 1000 // 1 minute
const LOCK_TTL_FOR_FILE_WATCHER = 60 * 60 // 1 hour

interface FileSnapshot {
  [filePath: string]: { mtimeMs: number }
}

class FileWatcher extends EventEmitter {
  private previousSnapshot: FileSnapshot = {}

  constructor(
    private watchFolder: string,
    private scanTime: number = DEFAULT_SCAN_INTERVAL
  ) {
    super()
  }

  async scanFiles(dir: string): Promise<FileSnapshot> {
    const snapshot: FileSnapshot = {}

    async function scan(subdir: string) {
      const entries: Dirent[] = await readdir(subdir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(subdir, entry.name)

        if (entry.isDirectory()) {
          await scan(fullPath)
        } else {
          try {
            const stats = await stat(fullPath)
            snapshot[fullPath] = { mtimeMs: stats.mtimeMs }
          } catch (err) {
            console.error(`[fileWatcher] error reading file: ${fullPath}`, err)
          }
        }
      }
    }

    await scan(dir)
    return snapshot
  }

  async detectChanges() {
    async function acquireFileWatcherLock(maxRetries = 10): Promise<boolean> {
      let attempts = 0
      while (attempts < maxRetries) {
        const lock = await acquireLock(
          'fileWatcher::all',
          LOCK_TTL_FOR_FILE_WATCHER
        )
        if (lock) return true

        attempts++
        const delay = Math.random() * 100 * Math.pow(2, attempts)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
      return false
    }

    const lock = await acquireFileWatcherLock()

    if (!lock) {
      console.error(
        `[fileWatcher] could no aquire lock for ${path} after 10 attempts`
      )
      return
    }

    try {
      const currentSnapshot = await this.scanFiles(this.watchFolder)
      const events: { event: 'add' | 'change' | 'unlink'; path: string }[] = []

      // Detect added or changed files
      for (const filePath in currentSnapshot) {
        if (!this.previousSnapshot[filePath]) {
          events.push({ event: 'add', path: filePath })
        } else if (
          this.previousSnapshot[filePath].mtimeMs !==
          currentSnapshot[filePath].mtimeMs
        ) {
          events.push({ event: 'change', path: filePath })
        }
      }

      // Detect deleted files
      for (const filePath in this.previousSnapshot) {
        if (!currentSnapshot[filePath]) {
          events.push({ event: 'unlink', path: filePath })
        }
      }

      this.previousSnapshot = currentSnapshot

      for (const { event, path } of events) {
        this.emit(event, path)
      }
      console.log(
        `[fileWatcher] run completed at ${new Date().toISOString()}, detected ${events.length} events, next run in ${this.scanTime / 1000}s`
      )
    } catch {
    } finally {
      await releaseLock('fileWatcher::all')
    }
  }

  async start() {
    console.log(`[fileWatcher] Watching folder: ${this.watchFolder}`)
    await this.detectChanges()
    this.emit('ready', '')
    setInterval(() => this.detectChanges(), this.scanTime)
  }
}

export default FileWatcher
