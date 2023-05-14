import { generateMetricSpace } from "./build-metric-space.mjs";
import { generateDistanceFunction } from "./cached-pinecone-distance.js";
import { loadIds } from "./document-ids.mjs";
import { hiAgg } from "./metric-clustering.js";

const ids = loadIds("ids.json");

console.log(`Loaded ${ids.size} ids`);

const { distanceFunction, saveCache } = generateDistanceFunction({
  topK: ids.size,
  filename: "distances.json",
});

const space = await generateMetricSpace(distanceFunction);

const start =
  "urn:sutro:%2FUsers%2Fdancrumb%2FProjects%2FSutro%2Fpackages%2Fsutro-common%2Fsrc%2Fassert.ts#563-799";

const nearest = await space.getNearestNeighbors(start, 10);

console.log({
  start,
  nearest: await Promise.all(
    nearest.map(async (n) => {
      return {
        id: n,
        distance: await distanceFunction(start, n),
      };
    })
  ),
});

saveCache();

const clusters = hiAgg(space);

console.log(clusters);
