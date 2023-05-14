import { existsSync, readFileSync } from "fs";
import * as math from "mathjs";
import { Matrix } from "mathjs";
import {
  density,
  findDisconnectedSubgraphs,
  laplacianMatrix,
} from "./graph-operations.mjs";
import { Graph } from "./graph.js";
import { kMeansClustering } from "./k-means-clustering.js";
import { isSymmetric } from "./matrix.js";

const orderOfMag = (num: number) => {
  if (num === 0) {
    return 0;
  }
  return math.floor(math.log10(math.abs(num)));
};

export function loadGraph(filename: string): Graph<any> {
  try {
    if (existsSync(filename)) {
      const contents = readFileSync(filename, "utf-8");
      return Graph.fromJSON(JSON.parse(contents), (x) => Math.floor(x * 100));
    }
  } catch (e) {
    return new Graph();
  }

  return new Graph();
}

const graph = loadGraph("graph.json");

const d = density(graph);

console.log(`Density: ${d}`);
console.log(`Order: ${graph.order}`);
console.log(`Regularity: ${graph.regularity}`);

const disconnectedGraphs = findDisconnectedSubgraphs(graph);
console.log(
  `Graph is ${disconnectedGraphs.length === 1 ? "connected" : "disconnected"}`
);

const laplace = laplacianMatrix(graph);

const laplaceIsSymmetric = isSymmetric(laplace);

console.log("Laplacian Matrix is symmetric: " + laplaceIsSymmetric);

const eigenStart = +Date.now();
console.log("Calculating eigenvalues and eigenvectors...");
const { vectors, values } = math.eigs(laplace);
const eigenEnd = +Date.now();
console.log(`Done in ${eigenEnd - eigenStart} ms`);

const vectorsAsArray = (vectors as Matrix).toArray();

const nonZeros = [];
(values as Matrix).forEach((value: number, index: number[]) => {
  if (math.unequal(value, 0) && orderOfMag(value) > -10) {
    nonZeros.push({ eigenValue: value, eigenVector: vectorsAsArray[index[0]] });
  }
});

nonZeros.sort((a, b) => {
  return b.eigenValue - a.eigenValue;
});

const numberOfClusters = Math.ceil(graph.order / 2);

const kVectors = nonZeros.slice(0, numberOfClusters).map((x) => x.eigenVector);

const nextMatrix = math.transpose(math.matrix(math.matrix(kVectors)));

const clusterStart = +Date.now();
console.log("Calculating clusters...");

const clusters = kMeansClustering(nextMatrix, numberOfClusters);

const clusterEnd = +Date.now();
console.log(`Done in ${clusterStart - clusterEnd} ms`);

console.log({
  clusters,
});
