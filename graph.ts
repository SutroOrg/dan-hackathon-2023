const NEIGHBORHOOD = Symbol("neighbors");

export type Edge = { vertices: readonly [string, string]; weight: number };

export class Graph<V extends { id: string }> {
  private vertices: Map<string, V> = new Map();
  private edges: Map<string, Edge> = new Map();

  private [NEIGHBORHOOD]: Map<string, Set<Edge>> = new Map();

  constructor(public directed = false) {}

  get order() {
    return this.vertices.size;
  }

  get edgeCount() {
    return this.edges.size;
  }

  get verticesIterator() {
    return Array.from(this.vertices.values()).sort()[Symbol.iterator]();
  }

  get edgesIterator() {
    return Array.from(this.edges.values()).sort()[Symbol.iterator]();
  }

  get regularity() {
    let degree: number | undefined;
    for (const vertex of this.verticesIterator) {
      const currentDegree = this.getDegree(vertex);
      if (degree === undefined) {
        degree = currentDegree;
      } else if (degree !== currentDegree) {
        return "not regular";
      }
    }
    return `${degree}-regular`;
  }

  containsVertex(vertex: V) {
    return this.vertices.has(vertex.id);
  }

  addVertex(vertex: V) {
    this.vertices.set(vertex.id, vertex);
  }

  connect(vertexA: V, vertexB: V, weight = 1) {
    this[NEIGHBORHOOD].delete(vertexA.id);
    this[NEIGHBORHOOD].delete(vertexB.id);
    if (vertexA.id === vertexB.id) {
      throw new Error("Cannot connect a vertex to itself");
    }
    if (!this.containsVertex(vertexA)) {
      this.addVertex(vertexA);
    }
    if (!this.containsVertex(vertexB)) {
      this.addVertex(vertexB);
    }
    const ids = [vertexA.id, vertexB.id] as const;
    if (this.directed) {
      this.edges.set(ids.join("->"), { vertices: ids, weight });
    } else {
      this.edges.set([...ids].sort().join("-"), { vertices: ids, weight });
    }
  }

  private getNeighborhood(vertex: V) {
    if (!this[NEIGHBORHOOD].has(vertex.id)) {
      const neighborhood = new Set<Edge>();
      this.edges.forEach((edge) => {
        edge.vertices;
        if (edge.vertices.includes(vertex.id)) {
          neighborhood.add(edge);
        }
      });
      this[NEIGHBORHOOD].set(vertex.id, neighborhood);
    }
    return this[NEIGHBORHOOD].get(vertex.id)!;
  }

  getNeighbors(vertex: V): Set<V> {
    const neighbors = new Set<V>();
    const neighborhood = this.getNeighborhood(vertex);

    neighborhood.forEach((edge) => {
      const [source, target] = edge.vertices;
      if (source === vertex.id) {
        neighbors.add(this.vertices.get(target)!);
      } else if (target === vertex.id) {
        neighbors.add(this.vertices.get(source)!);
      }
    });

    return neighbors;
  }

  getDegree(vertex: V) {
    let degree = 0;
    const neighborhood = this.getNeighborhood(vertex);
    for (const edge of neighborhood.values()) {
      degree += edge.weight;
    }
    return degree;
  }

  getEdge(vertexA: V, vertexB: V): Edge | null {
    if (vertexA.id === vertexB.id) {
      return null;
    }
    const neighborhood = this.getNeighborhood(vertexA);
    for (const edge of neighborhood) {
      if (edge.vertices.includes(vertexB.id)) {
        return edge;
      }
    }
    return null;
  }

  areConnected(vertexA: V, vertexB: V) {
    return this.getNeighbors(vertexA).has(vertexB);
  }

  toJSON() {
    return {
      directed: this.directed,
      vertices: Object.fromEntries(this.vertices),
      edges: Object.fromEntries(this.edges),
    };
  }

  static fromJSON(
    json: any,
    weightScaler: (weight: number) => number = (x) => x
  ) {
    const graph = new Graph(json.directed);
    graph.vertices = new Map(Object.entries(json.vertices));
    graph.edges = new Map(
      Object.entries<Edge>(json.edges).map(([key, edge]) => [
        key,
        { ...edge, weight: weightScaler(edge.weight) },
      ])
    );

    return graph;
  }
}
