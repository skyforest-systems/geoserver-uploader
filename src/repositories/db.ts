import { createClient } from "redis";
import { DatasetQueueItem, DatasetStructure } from "../interfaces";

// Create a single Redis client instance and reuse it
const redisClient = createClient();

redisClient.on("error", (err) => console.log("Redis Client Error", err));

const initializeRedisClient = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

// Ensure the client is initialized before use
const ensureRedisClient = async () => {
  if (!redisClient.isOpen) {
    await initializeRedisClient();
  }
};

const checkIfDatasetIsNew = async (key: string, hash: string) => {
  try {
    await ensureRedisClient();

    const existsKey = await redisClient.exists(key);

    if (existsKey === 0) {
      return true;
    }

    const datasetHash = await redisClient.hGetAll(key);

    return datasetHash.hash !== hash;
  } catch (error) {
    console.error(`[checkIfDatasetIsNew] Error: ${error}`);
    throw error;
  }
};

const checkForReadyToQueueDatasets = async () => {
  try {
    await ensureRedisClient();

    const keys = await redisClient.keys("*");

    const hashKeys = await Promise.all(
      keys.map(async (key) => {
        const type = await redisClient.type(key);
        return type === "hash" ? key : null;
      })
    );

    const filteredKeys = hashKeys.filter((key) => key !== null);

    const datasets: { [key: string]: any }[] = await Promise.all(
      filteredKeys.map(async (key) => {
        const dataset = await redisClient.hGetAll(key);
        return { key, ...dataset };
      })
    );

    const now = Date.now();

    return datasets
      .filter(
        (dataset) =>
          dataset.status === "added" &&
          parseInt(dataset.lastUpdated, 10) < now - 1000 * 120
      )
      .map((current) => ({
        ...current,
        structure: JSON.parse(current.structure),
      }));
  } catch (error) {
    console.error(`[checkForReadyToQueueDatasets] Error: ${error}`);
  }
};

const checkForQueuedDatasets = async () => {
  try {
    await ensureRedisClient();

    const keys = await redisClient.keys("*");

    const hashKeys = await Promise.all(
      keys.map(async (key) => {
        const type = await redisClient.type(key);
        return type === "hash" ? key : null;
      })
    );

    const filteredKeys = hashKeys.filter((key) => key !== null);

    const datasets: { [key: string]: any }[] = await Promise.all(
      filteredKeys.map(async (key) => {
        const dataset = await redisClient.hGetAll(key);
        return { key, ...dataset };
      })
    );

    return datasets
      .filter((dataset) => dataset.status === "queued")
      .map((current) => ({
        ...current,
        structure: JSON.parse(current.structure),
      }));
  } catch (error) {
    console.error(`[checkForQueuedDatasets] Error: ${error}`);
  }
};

const removeDatasetFromList = async (key: string) => {
  try {
    await ensureRedisClient();

    await redisClient.del(key);
  } catch (error) {
    console.error(`[removeDatasetFromList] Error: ${error}`);
    throw error;
  }
};

const changeDatasetStatus = async (key: string, status: string) => {
  try {
    await ensureRedisClient();

    await redisClient.hSet(key, "status", status);
  } catch (error) {
    console.error(`[changeDatasetStatus] Error: ${error}`);
    throw error;
  }
};

const getAllDatasetsForYearAndCustomer = async (
  year: string,
  customer: string
): Promise<DatasetStructure[]> => {
  try {
    await ensureRedisClient();

    const keys = await redisClient.keys("*");

    const datasets: { [key: string]: any }[] = await Promise.all(
      keys.map(async (key) => {
        const dataset = await redisClient.hGetAll(key);
        return { key, ...dataset };
      })
    );

    return datasets
      .filter(
        (dataset) =>
          JSON.parse(dataset.structure).year === year &&
          JSON.parse(dataset.structure).customer === customer
      )
      .map((current) => JSON.parse(current.structure));
  } catch (error) {
    console.error(`[getAllDatasetsForYearAndCustomer] Error: ${error}`);
    throw error;
  }
};

const addDatasetsToProcessingQueue = async (datasets: DatasetQueueItem[]) => {
  try {
    await ensureRedisClient();
    const pipeline = redisClient.multi();

    datasets.forEach(({ structure, hash }) => {
      pipeline.hSet(structure.dir, {
        hash,
        structure: JSON.stringify(structure),
        status: "added",
        lastUpdated: new Date().toISOString(),
      });
    });

    await pipeline.exec();
  } catch (error) {
    console.error(`[addDatasetsToProcessingQueue] Error: ${error}`);
    throw error;
  }
};

const saveInitialState = async (initialState: string) => {
  try {
    await ensureRedisClient();
    await redisClient.set("initialState", initialState);
  } catch (error) {
    console.error(`[saveInitialState] Error: ${error}`);
    throw error;
  }
};

const getInitialState = async () => {
  try {
    await ensureRedisClient();
    return await redisClient.get("initialState");
  } catch (error) {
    console.error(`[getInitialState] Error: ${error}`);
    throw error;
  }
};

export {
  redisClient,
  checkIfDatasetIsNew,
  addDatasetsToProcessingQueue,
  checkForQueuedDatasets,
  removeDatasetFromList,
  getAllDatasetsForYearAndCustomer,
  checkForReadyToQueueDatasets,
  changeDatasetStatus,
  saveInitialState,
  getInitialState,
};
