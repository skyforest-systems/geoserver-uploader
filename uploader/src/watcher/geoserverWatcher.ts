import { acquireLock, releaseLock } from '../repositories/db'
import { getLayersFromWorkspace } from '../services/getLayersFromWorkspace'
import { getWorkspaces } from '../services/getWorkspaces'
import { removeWorkspace } from '../services/removeWorkspace'

const LOCK_TTL_FOR_GEOSERVER_WATCHER = 60 * 60 // 1 hour

export async function geoserverWatcher() {
  const lock = await acquireLock(
    'geoserverWatcher',
    LOCK_TTL_FOR_GEOSERVER_WATCHER
  )
  if (!lock) return
  try {
    // this controller executes cleanup operations on geoserver
    const workspaces = await getWorkspaces()

    if (!workspaces || workspaces.length === 0) return

    for (const workspace of workspaces) {
      const layers = await getLayersFromWorkspace(workspace.name)
      if (!layers || layers.length === 0) {
        console.log(
          `[geoserverWatcher] no layers found in workspace ${workspace.name}, removing workspace`
        )
        await removeWorkspace(workspace.name)
      }
    }
  } catch (error) {
    console.error(`[geoserverWatcher] error:`, error)
  } finally {
    releaseLock('geoserverWatcher')
  }
}
