import ts from "typescript";
import { PineconeClient } from "@pinecone-database/pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { Metadata } from "./vector-store.js";

const generateUri = (filename: string, start: number, end: number) =>
  `urn:sutro:${encodeURIComponent(filename)}#${start}-${end}`;

const fileSet = new Set<string>();
const docs: Record<string, Document<Metadata>> = {};

const visitNode = (sourceFile: ts.SourceFile) => (node: ts.Node) => {
  if (node.kind === ts.SyntaxKind.EndOfFileToken) {
    return;
  }
  if (ts.isImportDeclaration(node)) {
    return;
  }
  console.log(`Node: ${sourceFile.fileName} - ${node.kind}`);
  const startPos = node.getStart();
  const endPos = startPos + node.getWidth();
  const metadata: Metadata = {
    startPos,
    endPos,
    nodeKind: node.kind,
    filename: sourceFile.fileName,
  };
  docs[generateUri(sourceFile.fileName, startPos, endPos)] =
    new Document<Metadata>({
      metadata,
      pageContent: node.getText(),
    });
};

function processFile(sourceFile: ts.SourceFile) {
  console.log(`Processing ${sourceFile.fileName}`);
  ts.forEachChild(sourceFile, visitNode(sourceFile));
}

function generateFileList(
  fileNames: string[],
  options: ts.CompilerOptions
): void {
  let program = ts.createProgram(fileNames, options);
  program.getTypeChecker(); // This is necessary to be able to get start and end positions
  program
    .getSourceFiles()
    .filter((sourceFile) => !/\.d\.ts$/.test(sourceFile.fileName))
    .forEach((sourceFile) => {
      if (!fileSet.has(sourceFile.fileName)) {
        processFile(sourceFile);
        fileSet.add(sourceFile.fileName);
        generateFileList([sourceFile.fileName], options);
      }
    });
}

export const buildVectorIndex = async (
  filenames: string[],
  ids = new Set<string>()
): Promise<Set<string>> => {
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX_NAME);
  await pineconeIndex.delete1({ deleteAll: true });

  generateFileList(filenames, {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });

  const docsForEmbedding: Document[] = [];
  const docIds: string[] = [];

  Object.keys(docs).forEach((id) => {
    ids.add(id);
    docIds.push(id);
    docsForEmbedding.push(docs[id]);
  });

  console.log(`Created ${docsForEmbedding.length} documents for embedding`);

  const store = new PineconeStore(new OpenAIEmbeddings(), {
    pineconeIndex,
    namespace: "sutro-classic",
  });

  const start = +Date.now();
  console.log("Adding documents...");
  await store.addDocuments(docsForEmbedding, docIds);
  console.log(`Completed (took ${+Date.now() - start}ms)`);
  return ids;
};
