/**
 * Implementation of https://arxiv.org/pdf/1509.07755.pdf
 */

import PQueue from "p-queue";
import { MetricSpace } from "./metric-space.js";
import { cpus } from "os";
import pg from "pg";

const NUM_CPUS = cpus().length;

export class HiAggAlgo {
  private metricSpace: MetricSpace<string>;
  private clusters: (string[] | null)[] = [];
  private pgClient: pg.Pool;

  constructor(metricSpace: MetricSpace<string>) {
    this.metricSpace = metricSpace;
    this.pgClient = new pg.Pool({
      max: NUM_CPUS * 2,
      ssl: { rejectUnauthorized: false },
    });
    this.pgClient.connect();
  }

  async distance(x: string, y: string) {
    const distXY = await this.metricSpace.distance(x, y);
    return distXY;
  }

  async relativeDistance2P(x: string, y: string) {
    const result = await this.pgClient.query(
      "SELECT * FROM rel_distance($1, $2)",
      [x, y]
    );
    return result.rows[0].rel_distance;
  }

  async relativeDistance1P(x: string) {
    const result = await this.pgClient.query("SELECT * FROM rel_distance($1)", [
      x,
    ]);
    return result.rows[0].rel_distance;
  }

  private jsToPgArray(arr: string[]) {
    return `ARRAY[${arr.map((a) => `'${a}'`).join(",")}]`;
  }

  async relativeDistance2Sets(s1: string[], s2: string[]) {
    const result = await this.pgClient.query(
      `SELECT * FROM rel_distance(${this.jsToPgArray(s1)}, ${this.jsToPgArray(
        s2
      )})`
    );
    return result.rows[0].rel_distance;
  }

  async pointCohesion(x: string, y: string) {
    const result = await this.pgClient.query("SELECT * FROM cohesion($1, $2)", [
      x,
      y,
    ]);
    return result.rows[0].rel_distance;
  }

  async calculateSetCohesion(s1: string[], s2: string[]) {
    const query = `SELECT * FROM cohesion(${this.jsToPgArray(
      s1
    )}, ${this.jsToPgArray(s2)})`;
    const result = await this.pgClient.query(query);
    return result.rows[0].cohesion;
  }

  async findCohesivePair(): Promise<[number, number] | null> {
    const { rows } = await this.pgClient.query(
      "SELECT * FROM cluster_cohesion WHERE cohesion > 0 AND cluster1 != cluster2 LIMIT 1;"
    );
    if (rows.length === 0) {
      return null;
    }
    const { cluster1, cluster2 } = rows[0];
    return [cluster1, cluster2];
  }

  async initClusterCohesion(clusterId: number, cluster: string[]) {
    if (cluster.length !== 1) {
      throw new Error("Cannot init cluster cohesion for non-singleton");
    }
    console.log(
      `Cluster Id: ${clusterId}; cluster contents: ${cluster[0].trim()}`
    );
    await this.pgClient.query("SELECT init_cluster_cohesion($1,$2);", [
      clusterId,
      cluster[0],
    ]);
  }

  async setClusterCohesion(
    cluster1: string[],
    cluster2: string[],
    cohesion?: number
  ) {
    const i = this.clusters.indexOf(cluster1);
    const j = this.clusters.indexOf(cluster2);
    cohesion =
      cohesion ?? (await this.calculateSetCohesion(cluster1, cluster2));

    console.log(`setClusterCohesion(${i}, ${j}, ${cohesion})`);
    this.pgClient.query(
      "INSERT INTO cluster_cohesion (cluster1, cluster2, cohesion) VALUES ($1, $2, $3) ON CONFLICT (cluster1, cluster2) DO UPDATE SET cohesion = $3",
      [i, j, cohesion]
    );
  }

  async getClusterCohesion(cluster1: string[], cluster2: string[]) {
    const i = this.clusters.indexOf(cluster1);
    const j = this.clusters.indexOf(cluster2);
    try {
      const result = await this.pgClient.query(
        "SELECT cohesion FROM cluster_cohesion WHERE cluster1 = $1 AND cluster2 = $2",
        [i, j]
      );
      return result.rows[0].cohesion;
    } catch (e) {
      console.log(`Failed to get cohesion for '${i}' and '${j}'`);
      console.log(e);
      throw e;
    }
  }

  async removeClusterCohesion(cluster1: string[], cluster2: string[]) {
    const i = this.clusters.indexOf(cluster1);
    const j = this.clusters.indexOf(cluster2);
    console.log(`removeClusterCohesion(${i}, ${j})`);
    await this.pgClient.query(
      "DELETE FROM cluster_cohesion WHERE (cluster1 = $1 AND cluster2 = $2) OR (cluster2 = $1 AND cluster1 = $2)",
      [i, j]
    );
  }

  async getEmbeddings() {
    const result = await this.pgClient.query("SELECT * FROM points;");
    return result.rows;
  }

  async execute() {
    console.log("Building initial clusters");
    const embeddings = await this.getEmbeddings();

    this.clusters = embeddings
      .sort((a, b) => a.rnum - b.rnum)
      .map((e) => [e.id]);

    console.log("Clearing old cluster cohesions");
    await this.pgClient.query("TRUNCATE cluster_cohesion;");
    console.log("Refreshing views");
    await this.pgClient.query("REFRESH MATERIALIZED VIEW store;");
    await this.pgClient.query("REFRESH MATERIALIZED VIEW points;");
    console.log("Building cluster cohesions");

    const overallStart = +Date.now();
    const totalCohesions = this.clusters.length;
    let totalCompleted = 0;

    console.log({ totalCohesions });

    const calculate = async (clusterId: number) => {
      console.log(
        `Calculating cohesions for ${clusterId} (${
          clusterId + 1
        } of ${totalCohesions})`
      );
      const start = +Date.now();
      await this.initClusterCohesion(clusterId, this.clusters[clusterId]);
      totalCompleted++;
      const end = +Date.now();
      console.log(
        `${clusterId + 1} finished. Took ${Math.ceil(
          (end - start) / 1000
        )}s. Running time: ${
          (end - overallStart) / 1000
        }s. Predicted total time: ~ ${Math.ceil(
          ((end - overallStart) * totalCohesions) / (1000 * totalCompleted)
        )}s`
      );
    };

    const queue = new PQueue({ concurrency: NUM_CPUS });
    for (let clusterId = 0; clusterId < this.clusters.length; clusterId++) {
      queue.add(() => calculate(clusterId));
    }
    await queue.onEmpty();
    console.log("Done");

    let cohesivePair: number[] | null = await this.findCohesivePair();
    console.log({ cohesivePair });
    while ((cohesivePair = await this.findCohesivePair())) {
      const [i, j] = cohesivePair;
      const k = this.clusters.length;
      console.log(
        `Merging ${i} and ${j} into cluster ${k}, current count ${
          this.clusters.filter(Boolean).length
        }`
      );
      const [si, sj] = [this.clusters[i], this.clusters[j]];
      const sk = [...si, ...sj];
      this.clusters.push(sk);

      const [iiCohesion, jjCohesion, ijCohesion] = await Promise.all([
        this.getClusterCohesion(si, si),
        this.getClusterCohesion(sj, sj),
        this.getClusterCohesion(si, sj),
      ]);

      this.setClusterCohesion(sk, sk, iiCohesion + jjCohesion + 2 * ijCohesion);

      for (let l = 0; l < k; l++) {
        if (l === i || l === j || this.clusters[l] === null) {
          continue;
        }
        const [ilCohesion, jlCohesion] = await Promise.all([
          this.getClusterCohesion(si, this.clusters[l]),
          this.getClusterCohesion(sj, this.clusters[l]),
        ]);
        console.log({ ilCohesion, jlCohesion });
        await this.setClusterCohesion(
          sk,
          this.clusters[l],
          ilCohesion + jlCohesion
        );
        await this.setClusterCohesion(
          this.clusters[l],
          sk,
          ilCohesion + jlCohesion
        );
      }
      for (let l = 0; l < k; l++) {
        if (this.clusters[l] === null) {
          continue;
        }
        await Promise.all([
          this.removeClusterCohesion(this.clusters[l], si),
          this.removeClusterCohesion(this.clusters[l], sj),
        ]);
      }
      this.clusters[i] = null;
      this.clusters[j] = null;
    }

    return this.clusters.filter((s) => s !== null);
  }
}
