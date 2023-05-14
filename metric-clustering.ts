/**
 * Implementation of https://arxiv.org/pdf/1509.07755.pdf
 */

import { MetricSpace } from "./metric-space";

const sigmaSigma = async (
  s1: string[],
  s2: string[],
  operation: (x: string, y: string) => Promise<number>
): Promise<number> => {
  console.log("sigmaSigma");
  const sigmaQueue = new PQueue({ concurrency: 1 });
  const sigmas = await sigmaQueue.addAll(
    s1.map((s1Point) => () => {
      return sigmaQueue.addAll(
        s2.map((s2Point) => () => {
          return operation(s1Point, s2Point);
        })
      );
    })
  );

  return sigmas.reduce((sum, d) => sum + d.reduce((s, d) => s + d, 0), 0);
};

import PQueue from "p-queue";

const sumDistances = async (
  x: string,
  metricSpace: MetricSpace<string>
): Promise<number> => {
  console.log("sumDistances");
  const points = Array.from(metricSpace.points.values());
  const sumQueue = new PQueue({ concurrency: 1 });

  const distances = await sumQueue.addAll(
    points.map((p) => () => metricSpace.distance(x, p))
  );

  return distances.reduce((sum, d) => sum + d, 0);
};

/**
 * Implementation of RD(x||y)
 */
export const relativeDistance2P = async (
  x: string,
  y: string,
  metricSpace: MetricSpace<string>
) => {
  console.log("relativeDistance2P");
  const distXY = await metricSpace.distance(x, y);
  const points = Array.from(metricSpace.points.values());

  return distXY - (await sumDistances(x, metricSpace)) / metricSpace.size;
};

/**
 * Implementation of RD(x)
 */
export const relativeDistance1P = async (
  x: string,
  metricSpace: MetricSpace<string>
) => {
  console.log("relativeDistance1P");
  const averageDistance =
    (await sumDistances(x, metricSpace)) / metricSpace.size;

  const points = Array.from(metricSpace.points.values());

  const allDistances = await Promise.all(
    points.map(async (p) => sumDistances(p, metricSpace))
  );
  const avgAllDistances =
    allDistances.reduce((sum, d) => sum + d, 0) /
    (metricSpace.size * metricSpace.size);

  return averageDistance - avgAllDistances;
};

/**
 * Implementation of RD(S1||S2)
 */
export const relativeDistance2Sets = async (
  s1: string[],
  s2: string[],
  metricSpace: MetricSpace<string>
) => {
  console.log("relativeDistance2Sets");
  const [sizeS1, sizeS2] = [s1.length, s2.length];

  return (
    (await sigmaSigma(s1, s2, (s1P, s2P) => metricSpace.distance(s1P, s2P))) /
    (sizeS1 * sizeS2)
  );
};

export const pointCohesion = async (
  x: string,
  y: string,
  metricSpace: MetricSpace<string>
) => {
  console.log("pointCohesion");
  return (
    (await relativeDistance1P(y, metricSpace)) -
    (await relativeDistance2P(x, y, metricSpace))
  );
};

export const setCohesion = async (
  s1: string[],
  s2: string[],
  metricSpace: MetricSpace<string>
) => {
  console.log("setCohesion");
  return await sigmaSigma(s1, s2, (s1P, s2P) =>
    pointCohesion(s1P, s2P, metricSpace)
  );
};

type Cohesions = ((number | null)[] | null)[];

const findCohesivePair = (cohesions: Cohesions): [number, number] | null => {
  for (let i = 0; i < cohesions.length; i++) {
    if (cohesions[i] === null) {
      continue;
    }
    for (let j = 0; j < cohesions[i].length; j++) {
      if (cohesions[i][j] === null) {
        continue;
      }

      if (cohesions[i][j] > 0) {
        return [i, j];
      }
    }
  }
  return null;
};

/**
 * The Hierarchical Agglomerative Clustering algorithm
 */
export const hiAgg = async (metricSpace: MetricSpace<string>) => {
  let S: (string[] | null)[] = Array.from(metricSpace.points.values()).map(
    (p) => [p]
  );
  console.log("Building cohesion measures");
  let cohesionMeasures: ((number | null)[] | null)[] = await Promise.all(
    S.map((s) => {
      return Promise.all(S.map((s2) => setCohesion(s, s2, metricSpace)));
    })
  );
  console.log("Complete");

  let cohesivePair: number[] | null = null;
  while ((cohesivePair = findCohesivePair(cohesionMeasures))) {
    const [i, j] = cohesivePair;
    const [si, sj] = [S[i], S[j]];
    const sk = [...si, ...sj];
    const k = S.length;
    console.log({ k });
    S.push(sk);
    S[i] = null;
    S[j] = null;

    cohesionMeasures[k] = Array(k + 1).fill(null);
    cohesionMeasures[k][k] =
      cohesionMeasures[i][i] +
      cohesionMeasures[j][j] +
      2 * cohesionMeasures[i][j];
    for (let l = 0; l < k; l++) {
      cohesionMeasures[k][l] = cohesionMeasures[i][l] + cohesionMeasures[j][l];
      cohesionMeasures[l][k] = cohesionMeasures[i][l] + cohesionMeasures[j][l];
      cohesionMeasures[l][i] = null;
      cohesionMeasures[l][j] = null;
      cohesionMeasures[i][l] = null;
      cohesionMeasures[j][l] = null;
    }
  }

  return S.filter((s) => s !== null);
};
