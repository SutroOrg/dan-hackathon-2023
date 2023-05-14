import { existsSync, readFileSync } from "fs";
import { toDot } from "./graph-operations.mjs";
import { Graph } from "./graph.js";

export function loadGraph(filename: string): Graph<any> {
  try {
    if (existsSync(filename)) {
      const contents = readFileSync(filename, "utf-8");
      return Graph.fromJSON(JSON.parse(contents));
    }
  } catch (e) {
    return new Graph();
  }

  return new Graph();
}

console.log(toDot(loadGraph("graph.json")));
