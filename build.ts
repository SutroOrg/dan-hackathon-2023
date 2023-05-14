import { buildVectorIndex } from "./build-index.mjs";
import { loadIds, saveIds } from "./document-ids.mjs";

const main = async () => {
  const ids = loadIds("ids.json");
  const files = process.argv.slice(2);
  const newIds = await buildVectorIndex(files, ids);
  saveIds("ids.json", newIds);
};

main()
  .then(() => {
    console.log("Completed");
  })
  .catch((e) => {
    console.error(e);
  });
