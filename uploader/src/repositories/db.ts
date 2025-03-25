import { createClient } from 'redis'
import { DatasetQueueItem, DatasetStructure, FileOnRedis } from '../interfaces'
import environments from '../environments'

// Create a single Redis client instance and reuse it
const redisClient = createClient({
  url: environments.redisUrl,
})

redisClient.on('error', (err) => console.log('Redis Client Error', err))

async function initializeRedisClient() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }
}

async function ensureRedisClient() {
  if (!redisClient.isOpen) {
    await initializeRedisClient()
  }
}

export async function testRedis() {
  try {
    await ensureRedisClient()
    await redisClient.ping()
  } catch (error) {
    throw error
  }
}

export async function checkRasterWatcherLock() {
  try {
    await ensureRedisClient()

    const keys = await getKeys('lock:::rasterWatcher*')
    if (keys.length > 0) {
      return true
    } else {
      return false
    }
  } catch (error) {
    throw error
  }
}

export async function checkIfFileAlreadyExists(path: string) {
  try {
    await ensureRedisClient()

    path = path.replace(/\\/g, '/')

    const existsKey = await redisClient.exists('file:::' + path)

    if (existsKey === 0) {
      return false
    }

    return true
  } catch (error) {
    throw error
  }
}

export async function getFile(path: string): Promise<FileOnRedis | null> {
  try {
    await ensureRedisClient()

    path = path.replace(/\\/g, '/')

    const file = (await redisClient.hGetAll('file:::' + path)) as any

    file.structure = JSON.parse(file.structure)

    return file
  } catch (error) {
    throw error
  }
}

export async function saveFile(file: FileOnRedis) {
  try {
    await ensureRedisClient()

    file.path = file.path.replace(/\\/g, '/')

    await redisClient.hSet('file:::' + file.path, {
      ...file,
      ts: new Date().getTime(),
      structure: JSON.stringify(file.structure),
    })
  } catch (error) {
    throw error
  }
}

export async function removeFile(path: string) {
  try {
    await ensureRedisClient()

    path = path.replace(/\\/g, '/')

    await redisClient.del('file:::' + path)
  } catch (error) {
    throw error
  }
}

export async function removeFilesByBasepath(basepath: string) {
  try {
    await ensureRedisClient()

    const pattern = 'file:::' + basepath + '/*'
    const keys = await getKeys(pattern)

    for (const key of keys) {
      await redisClient.del(key)
    }

    return keys
  } catch (error) {
    throw error
  }
}

export async function getFilesByPattern(
  pattern: string
): Promise<FileOnRedis[]> {
  try {
    const keys = await getAllFiles()

    const result: FileOnRedis[] = []
    for (const key of keys) {
      if (!key.includes(pattern)) continue
      const keyType = await redisClient.type(key)

      if (keyType === 'hash') {
        const hashData = await redisClient.hGetAll(key)
        result.push({
          path: hashData.path,
          basepath: hashData.basepath,
          hash: hashData.hash,
          status: hashData.status as FileOnRedis['status'],
          ts: parseInt(hashData.ts, 10),
          structure: JSON.parse(hashData.structure),
        })
      }
    }

    return result
  } catch (error) {
    throw error
  }
}

export async function getFilesByStatus(
  status: FileOnRedis['status']
): Promise<FileOnRedis[]> {
  try {
    const pattern = 'file:::*'
    const keys = await getKeys(pattern)

    const result: FileOnRedis[] = []
    for (const key of keys) {
      const keyType = await redisClient.type(key)
      if (keyType !== 'hash') continue

      const hashData = await redisClient.hGetAll(key)
      if (hashData.status === status) {
        result.push({
          path: hashData.path,
          basepath: hashData.basepath,
          hash: hashData.hash,
          status: hashData.status as FileOnRedis['status'],
          ts: parseInt(hashData.ts, 10),
          structure: JSON.parse(hashData.structure),
        })
      }
    }

    return result
  } catch (error) {
    throw error
  }
}

async function getKeys(pattern: string): Promise<string[]> {
  const keys: string[] = []

  for await (const key of redisClient.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keys.push(key)
  }

  return keys
}

export async function acquireLock(key: string, ttl: number = 600) {
  try {
    await ensureRedisClient()

    key = key.replace(/\\/g, '/')

    const aquired = await redisClient.set('lock:::' + key, 'locked', {
      NX: true, // Only set if not exists
      EX: ttl, // Set expiry time
    })
    return aquired
  } catch (error) {
    throw error
  }
}

export async function releaseLock(key: string) {
  try {
    await ensureRedisClient()

    key = key.replace(/\\/g, '/')

    await redisClient.del('lock:::' + key)
  } catch (error) {
    throw error
  }
}

export async function releaseAllLocks() {
  try {
    await ensureRedisClient()

    const keys = await getKeys('lock:::*')
    for (const key of keys) {
      await redisClient.del(key)
    }
  } catch (error) {
    throw error
  }
}

export async function revertProcessingStatusToQueued() {
  try {
    await ensureRedisClient()

    // get all keys, check those with the status processing, change those to queued

    const keys = await getKeys('file:::*')
    for (const key of keys) {
      const file = await redisClient.hGetAll(key)
      if (file.status === 'processing') {
        await redisClient.hSet(key, 'status', 'queued')
      }
    }
  } catch (error) {
    throw error
  }
}

export async function changeFileStatusByBasepath(
  basepath: string,
  status: FileOnRedis['status']
) {
  try {
    await ensureRedisClient()

    basepath = basepath.replace(/\\/g, '/')

    const pattern = 'file:::' + basepath + '*'
    const keys = await getKeys(pattern)

    if (keys.length === 0) {
      console.warn(
        `[changeFileStatusByBasepath] no files found for ${basepath}`
      )
      return
    }
    for (const key of keys) {
      await redisClient.hSet(key, 'status', status)
    }
  } catch (error) {
    throw error
  }
}

export default async function getLocks() {
  try {
    const pattern = 'lock:::*'
    const keys = await getKeys(pattern)

    return keys
  } catch (error) {
    throw error
  }
}

export async function getAllFiles() {
  try {
    const pattern = 'file:::*'
    const keys = await getKeys(pattern)

    return keys
  } catch (error) {
    throw error
  }
}
