import { loadIds } from "./document-ids.mjs";
import { MetricSpace } from "./metric-space.js";

export const generateMetricSpace = async (
  distanceFunction: (a: string, b: string) => Promise<number>
) => {
  const ids = loadIds("ids.json");

  const metricSpace = new MetricSpace(distanceFunction);

  ids.forEach((id) => {
    metricSpace.addPoint(id);
  });

  return metricSpace;
};
