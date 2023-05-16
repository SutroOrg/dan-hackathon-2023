import { generateMetricSpace } from "./build-metric-space.mjs";
import { generateDistanceFunction } from "./cached-pinecone-distance.js";

import { HiAggAlgo } from "./metric-clustering.js";

const { distanceFunction } = generateDistanceFunction();

const space = await generateMetricSpace(distanceFunction);

console.log("Running HiAgg");

const hiAgg = new HiAggAlgo(space);

const clusters = await hiAgg.execute();

console.log({ clusters });

console.log(`Merged into ${clusters.length} clusters`);

process.exit(0);
