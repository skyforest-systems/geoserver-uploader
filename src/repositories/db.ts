import { createClient } from "redis";
import { DatasetQueueItem, DatasetStructure, FileOnRedis } from "../interfaces";
import environments from "../environments";

// Create a single Redis client instance and reuse it
const redisClient = createClient({
  url: environments.redisUrl,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

async function initializeRedisClient() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

async function ensureRedisClient() {
  if (!redisClient.isOpen) {
    await initializeRedisClient();
  }
}

export async function checkIfFileAlreadyExists(path: string) {
  try {
    await ensureRedisClient();

    const existsKey = await redisClient.exists("file:::" + path);

    if (existsKey === 0) {
      return false;
    }

    return true;
  } catch (error) {
    throw error;
  }
}

export async function getFile(path: string): Promise<FileOnRedis | null> {
  try {
    await ensureRedisClient();

    const file = (await redisClient.hGetAll("file:::" + path)) as any;

    return file;
  } catch (error) {
    throw error;
  }
}

export async function saveFile(file: FileOnRedis) {
  try {
    await ensureRedisClient();

    await redisClient.hSet("file:::" + file.path, {
      ...file,
      ts: new Date().getTime(),
    });
  } catch (error) {
    throw error;
  }
}
export async function getFilesByStatus(
  status: FileOnRedis["status"]
): Promise<FileOnRedis[]> {
  try {
    const pattern = "file:::*";
    const keys = await getKeys(pattern);

    const result: FileOnRedis[] = [];
    for (const key of keys) {
      const keyType = await redisClient.type(key);
      if (keyType !== "hash") continue;

      const hashData = await redisClient.hGetAll(key);
      if (hashData.status === status) {
        result.push({
          path: hashData.path,
          basepath: hashData.basepath,
          hash: hashData.hash,
          status: hashData.status as FileOnRedis["status"],
          ts: parseInt(hashData.ts, 10),
        });
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
}

async function getKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];

  for await (const key of redisClient.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keys.push(key);
  }

  return keys;
}

export async function acquireLock(key: string, ttl: number = 600) {
  try {
    await ensureRedisClient();

    const aquired = await redisClient.set(key, "locked", {
      NX: true, // Only set if not exists
      EX: ttl, // Set expiry time
    });

    if (!aquired) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    throw error;
  }
}

export async function releaseLock(key: string) {
  try {
    await ensureRedisClient();

    await redisClient.del(key);
  } catch (error) {
    throw error;
  }
}

export async function changeFileStatusByBasepath(
  basepath: string,
  status: FileOnRedis["status"]
) {
  try {
    await ensureRedisClient();

    const pattern = "file:::" + basepath + "*";
    const keys = await getKeys(pattern);

    for (const key of keys) {
      await redisClient.hSet(key, "status", status);
    }
  } catch (error) {
    throw error;
  }
}