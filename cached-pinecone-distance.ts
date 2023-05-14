import { PineconeClient } from "@pinecone-database/pinecone";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import PQueue from "p-queue";

type Cache = Map<string, Map<string, number>>;

export function loadDistances(filename: string): Cache {
  try {
    if (existsSync(filename)) {
      const contents = readFileSync(filename, "utf-8");
      const mapAsArray = JSON.parse(contents);
      return new Map(mapAsArray.map(([key, value]) => [key, new Map(value)]));
    }
  } catch (e) {
    return new Map();
  }

  return new Map();
}

export function saveDistances(filename: string, distances: Cache) {
  const mapAsArray = [];
  const topEntries = distances.entries();
  for (const entry of topEntries) {
    const [key, value] = entry;
    mapAsArray.push([key, [...value.entries()]]);
  }

  writeFileSync(filename, JSON.stringify(mapAsArray));
}

const client = new PineconeClient();
await client.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});
const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

const readCacheGenerator = (cache: Cache) => (a: string, b: string) => {
  if (cache.has(a)) {
    const aMap = cache.get(a);
    if (aMap.has(b)) {
      return aMap.get(b);
    }
  }
  if (cache.has(b)) {
    const bMap = cache.get(b);
    if (bMap.has(a)) {
      return bMap.get(a);
    }
  }
  return undefined;
};

const writeCacheGenerator =
  (cache: Cache) => (a: string, b: string, distance: number) => {
    if (cache.has(a)) {
      const aMap = cache.get(a);
      aMap.set(b, distance);
    } else {
      cache.set(a, new Map([[b, distance]]));
    }
    if (cache.has(b)) {
      const bMap = cache.get(b);
      bMap.set(a, distance);
    } else {
      cache.set(b, new Map([[a, distance]]));
    }
  };

export type DistanceFunctionOptions = {
  topK: number;
  filename: string;
};

export const generateDistanceFunction = ({
  topK,
  filename,
}: DistanceFunctionOptions) => {
  console.log("generateDistanceFunction");
  const cache = loadDistances(filename);
  const readCache = readCacheGenerator(cache);
  const writeCache = writeCacheGenerator(cache);
  const queue = new PQueue({ concurrency: 1 });

  const saveCache = () => {
    console.log("Saving cache");
    saveDistances(filename, cache);
  };

  const distanceFunction = async (a: string, b: string) => {
    const cached = readCache(a, b);
    if (cached !== undefined) {
      return cached;
    }

    const { matches } = await queue.add(
      () =>
        pineconeIndex
          .query({
            queryRequest: {
              topK,
              id: a,
              includeMetadata: true,
              namespace: "sutro-classic",
            },
          })
          .catch((e) => {
            console.log("Error querying Pinecone", e);
            throw e;
          }),
      { throwOnTimeout: true }
    );

    console.log({ matches });

    matches.forEach(({ score, id }) => {
      const distance = score;
      writeCache(a, id, distance);
      saveCache();
    });

    return readCache(a, b);
  };

  return { distanceFunction, saveCache };
};
