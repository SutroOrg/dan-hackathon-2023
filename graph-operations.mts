import type { Edge, Graph } from "./graph.js";
import { createHash } from "node:crypto";
import { subtract } from "./matrix.js";
import type { Matrix } from "mathjs";
import * as math from "mathjs";
import { inspect } from "node:util";

export const density = (graph: Graph<any>) => {
  return graph.order === 1
    ? 0
    : (2 * graph.edgeCount) / (graph.order * (graph.order - 1));
};

export const adjacencyList = (graph: Graph<any>): Map<string, string[]> => {
  const list = new Map<string, string[]>();
  const vertices = Array.from(graph.verticesIterator);
  vertices.map((vertexA) => {
    const neighbors = graph.getNeighbors(vertexA);
    list.set(
      vertexA.id,
      Array.from(neighbors.values()).map((vertex) => vertex.id)
    );
  });
  return list;
};

export const adjacencyMatrix = (graph: Graph<any>): Matrix => {
  const vertices = Array.from(graph.verticesIterator);
  const matrix = vertices.map((vertexA) => {
    return vertices.map((vertexB) => {
      const edge = graph.getEdge(vertexA, vertexB);
      if (edge) {
        return edge.weight;
      }
      return 0;
    });
  });
  // console.log(inspect(matrix, false, 10, true));
  return math.matrix(matrix);
};

export const degreeMatrix = (graph: Graph<any>): Matrix => {
  const vertices = Array.from(graph.verticesIterator);
  const matrix = vertices.map((vertexA) => {
    return vertices.map((vertexB) => {
      if (vertexA.id === vertexB.id) {
        return graph.getDegree(vertexA);
      }
      return 0;
    });
  });
  return math.matrix(matrix);
};

export const cut = <V extends { id: string } = any>(
  graph: Graph<V>,
  subSet: Set<string>
) => {
  const otherSet = new Set<string>();
  for (const vertex of graph.verticesIterator) {
    if (!subSet.has(vertex.id)) {
      otherSet.add(vertex.id);
    }
  }
  return otherSet;
};

export const cutEdges = <V extends { id: string } = any>(
  graph: Graph<V>,
  subSet: Set<string>
) => {
  const otherSet = cut(graph, subSet);
  const crossingEdges: Edge[] = [];
  for (const edge of graph.edgesIterator) {
    if (subSet.has(edge.vertices[0]) && otherSet.has(edge.vertices[1])) {
      crossingEdges.push(edge);
    } else if (subSet.has(edge.vertices[1]) && otherSet.has(edge.vertices[0])) {
      crossingEdges.push(edge);
    }
  }
  return crossingEdges;
};

export const laplacianMatrix = (graph: Graph<any>): Matrix => {
  const adj = adjacencyMatrix(graph);
  const deg = degreeMatrix(graph);
  const lap = subtract(deg, adj);
  return lap;
};

export const toDot = (graph: Graph<any>) => {
  function c(data: string) {
    return createHash("sha1").update(data, "binary").digest("hex").slice(0, 8);
  }
  const lines = [
    graph.directed ? "digraph {" : "graph {",
    ...Array.from(graph.verticesIterator).map((vertex) => {
      return `  "${c(vertex.id)}" [label="${c(vertex.id)} ${graph.getDegree(
        vertex
      )}"]`;
    }),
    ...Array.from(graph.edgesIterator).map((edge) => {
      return `  ${edge.vertices
        .map(c)
        .map((id) => `"${id}"`)
        .join(graph.directed ? " -> " : " -- ")} [weight=${edge.weight}]`;
    }),
    "}",
  ];
  return lines.join("\n");
};

export const findDisconnectedSubgraphs = (graph: Graph<any>): string[][] => {
  const visited: boolean[] = []; // keep track of visited vertices
  const subgraphs: string[][] = []; // array to hold the disconnected subgraphs

  const adjList = adjacencyList(graph);

  // define the DFS function
  function dfs(vertexId: string, subgraph: string[]) {
    visited[vertexId] = true;
    subgraph.push(vertexId);

    for (const neighbor of adjList.get(vertexId) ?? []) {
      if (!visited[neighbor]) {
        dfs(neighbor, subgraph);
      }
    }
  }

  // perform a DFS starting from each vertex
  for (let vertex of adjList.keys()) {
    if (!visited[vertex]) {
      const subgraph: string[] = [];
      dfs(vertex, subgraph);
      subgraphs.push(subgraph);
    }
  }

  return subgraphs;
};
