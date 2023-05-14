import { PineconeClient } from "@pinecone-database/pinecone";
import { Graph } from "./graph.js";
import PQueue from "p-queue";
import { loadIds } from "./document-ids.mjs";
import { Metadata } from "./vector-store.js";

const TOP_K = 10;

export const generateGraph = async () => {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);

  const ids = loadIds("ids.json");
  const docs = new Map<string, Metadata | { id: string }>();

  const queue = new PQueue({ concurrency: 10 });
  await Promise.all(
    [...ids].map(async (id) => {
      try {
        await queue.add(
          async () => {
            console.log(`Fetching: ${id}`);
            const { vectors } = await pineconeIndex.fetch({
              ids: [id],
              namespace: "sutro-classic",
            });

            Object.keys(vectors).forEach((id) => {
              console.log(`Loading ${id}`);
              const vector = vectors[id];
              const { metadata } = vector;
              docs.set(id, {
                id,
                ...metadata,
              });
            });
          },
          {
            throwOnTimeout: true,
          }
        );
        console.log(`Fetching for ${id} completed`);
      } catch (e) {
        console.error(`Caught error querying for ${id}`);
        throw e;
      }
    })
  );

  const neighbors = await Promise.all(
    [...ids].map(async (id) => {
      try {
        const result = await queue.add(
          () => {
            console.log(`Querying: ${id}`);

            return pineconeIndex.query({
              queryRequest: {
                topK: TOP_K,
                id,
                includeMetadata: true,
                namespace: "sutro-classic",
              },
            });
          },
          {
            throwOnTimeout: true,
          }
        );
        console.log(`Query for ${id} completed`);
        return {
          id,
          result,
        };
      } catch (e) {
        console.error(`Caught error querying for ${id}`);
        throw e;
      }
    })
  );

  console.log(`Loaded ${ids.size} ids`);
  console.log(`Fetched ${docs.size} docs`);
  console.log(`Generated ${neighbors.length} neighbors`);

  const graph = new Graph<{ id: string }>();
  neighbors.forEach(({ id, result }) => {
    result.matches.forEach((match) => {
      console.log({ id, matchId: match.id });
      if (match.id === id) {
        return;
      }
      const source = { id, ...docs.get(id) };
      const target = { id: match.id, ...docs.get(match.id) };
      const distance = 1 - match.score;
      if (distance > 0) {
        graph.connect(source, target, 1 - match.score);
      }
    });
  });

  return graph;
};
