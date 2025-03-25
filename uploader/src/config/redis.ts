import { createClient } from 'redis'
import environments from './environments'

// Create a single Redis client instance and reuse it
export const redisClient = createClient({
  url: environments.redisUrl,
})

redisClient.on('error', (err) => console.log('Redis Client Error', err))

export async function initializeRedisClient() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }
}

export async function ensureRedisClient() {
  if (!redisClient.isOpen) {
    await initializeRedisClient()
  }
}

export const redisConnection = {
  host: environments.redisHost,
  port: parseInt(environments.redisPort),
}
