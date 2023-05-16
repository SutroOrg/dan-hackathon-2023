import ts from "typescript";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Metadata } from "./vector-store.js";

import pg from "pg";

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
      console.log(`Analyzing ${sourceFile.fileName}...`);
      if (!fileSet.has(sourceFile.fileName)) {
        processFile(sourceFile);
        fileSet.add(sourceFile.fileName);
        generateFileList([sourceFile.fileName], options);
      }
    });
}

export const buildVectorIndex = async (
  filenames: string[],
  batchSize = 20
): Promise<void> => {
  console.log("Connecting to Postgres");
  const pgClient = new pg.Client({ ssl: { rejectUnauthorized: false } });
  await pgClient.connect();
  await pgClient.query("TRUNCATE TABLE embeddings;");
  generateFileList(filenames, {
    noEmitOnError: true,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
  });

  const docsForEmbedding: Document[] = [];

  Object.keys(docs).forEach((id) => {
    docsForEmbedding.push(docs[id]);
  });

  console.log(`Created ${docsForEmbedding.length} documents for embedding`);

  const start = +Date.now();
  console.log("Adding documents...");
  const embeddings = new OpenAIEmbeddings();

  const EMBED_QUERY =
    "INSERT INTO embeddings (id, content, vector) VALUES ($1, $2, $3);";

  const docEntries = Object.entries(docs);

  for (let i = 0; i < docEntries.length; i += batchSize) {
    console.log(
      `Chunk ${i / batchSize} of ${Math.ceil(docEntries.length / batchSize)}`
    );
    const chunk = docEntries.slice(i, i + batchSize);
    const chunkEmbeddings = await embeddings.embedDocuments(
      chunk.map((c) => c[1].pageContent)
    );
    for (let j = 0; j < chunk.length; j++) {
      const [id, doc] = chunk[j];
      const embedding = chunkEmbeddings[j];
      await pgClient.query(EMBED_QUERY, [
        id,
        doc.pageContent,
        JSON.stringify(embedding),
      ]);
    }
  }

  console.log(`Completed (took ${+Date.now() - start}ms)`);
  pgClient.end();
};

// Completed (took 243483ms)
// Batch 10 = Completed (took 36457ms)
// Batch 20 = Completed (took 19417ms)
