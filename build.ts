import { buildVectorIndex } from "./build-index.mjs";

const main = async () => {
  const files = process.argv.slice(2);
  await buildVectorIndex(files);
};

main()
  .then(() => {
    console.log("Completed");
  })
  .catch((e) => {
    console.error(e);
  });
