import { PineconeClient } from "@pinecone-database/pinecone";
import { saveIds } from "./document-ids.mjs";

const client = new PineconeClient();
client
  .init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  })
  .then(() => {
    return client.Index(process.env.PINECONE_INDEX_NAME);
  })
  .then((pineconeIndex) =>
    pineconeIndex.delete1({ deleteAll: true, namespace: "sutro-classic" })
  )
  .then(() => {
    saveIds("ids.json", new Set());
    console.log("Completed");
  });
