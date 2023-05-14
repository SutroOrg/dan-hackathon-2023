import * as math from "mathjs";
import { Matrix } from "mathjs";

function euclideanDistance(v1: Matrix, v2: Matrix): number {
  const [m] = v1.size();
  let sum = 0;
  for (let i = 0; i < m; i++) {
    sum += Math.pow(v1.get([i]) - v2.get([i]), 2);
  }
  return Math.sqrt(sum);
}

function getInitialCentroids(matrix: Matrix, k: number) {
  const [n, m] = matrix.size();
  const centroids: Matrix[] = [];
  for (let i = 0; i < k; i++) {
    const centroid: number[] = [];
    for (let j = 0; j < m; j++) {
      centroid.push(Math.random());
    }
    centroids.push(math.matrix(centroid));
  }
  return centroids;
}

function calculateNewCentroids(
  matrix: Matrix,
  clusters: number[][],
  k: number
) {
  const [n, m] = matrix.size();
  let centroids: Matrix[] = []; // initialize centroids
  for (let i = 0; i < k; i++) {
    const centroid: number[] = new Array(m).fill(0);
    const clusterSize = clusters[i].length;
    for (const rowIndex of clusters[i]) {
      for (let j = 0; j < m; j++) {
        centroid[j] += matrix.get([rowIndex, j]) as number;
      }
    }
    for (let j = 0; j < m; j++) {
      centroid[j] /= clusterSize;
    }
    centroids.push(math.matrix(centroid));
  }
  return centroids;
}

function assignRowsToClusters(matrix: Matrix, centroids: Matrix[], k: number) {
  const [n] = matrix.size();
  const clusters: number[][] = new Array(k).fill(null).map(() => []); // initialize k clusters
  for (let i = 0; i < n; i++) {
    let closestCentroidIndex = -1;
    let closestDistance = Infinity;
    for (let j = 0; j < k; j++) {
      const distance = euclideanDistance(
        math.squeeze(math.row(matrix, i)),
        centroids[j]
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCentroidIndex = j;
      }
    }
    clusters[closestCentroidIndex].push(i);
  }
  return clusters;
}

export function kMeansClustering(matrix: Matrix, k: number): number[][] {
  const [n, m] = matrix.size(); // number of rows

  let centroids: Matrix[] = getInitialCentroids(matrix, k);

  let clusters: number[][] = new Array(k).fill(null).map(() => []); // initialize k clusters

  // perform k-means clustering
  for (let i = 0; i < 100; i++) {
    // assign rows to clusters based on current centroids
    clusters = assignRowsToClusters(matrix, centroids, k);
    // calculate new centroids based on current clusters
    centroids = calculateNewCentroids(matrix, clusters, k);
  }

  return clusters;
}
