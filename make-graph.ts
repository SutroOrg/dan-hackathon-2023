import { writeFileSync } from "node:fs";
import { generateGraph } from "./build-graph.mjs";
// import { loadIds, saveIds } from "./document-ids.mjs";

const main = async () => {
  const graph = await generateGraph();
  writeFileSync("graph.json", JSON.stringify(graph));
};

main()
  .then(() => {
    console.log("Completed");
  })
  .catch((e) => {
    console.error(e);
  });
