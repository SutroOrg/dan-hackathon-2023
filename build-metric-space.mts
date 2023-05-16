import { MetricSpace } from "./metric-space.js";
import pg from "pg";

const pgClient = new pg.Client({ ssl: { rejectUnauthorized: false } });
export const generateMetricSpace = async (
  distanceFunction: (a: string, b: string) => Promise<number>
) => {
  await pgClient.connect();
  const result = await pgClient.query("SELECT id FROM embeddings;");
  const ids = result.rows.map((row) => row.id);
  pgClient.end();

  const metricSpace = new MetricSpace(distanceFunction);

  ids.forEach((id) => {
    metricSpace.addPoint(id);
  });

  return metricSpace;
};
