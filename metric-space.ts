export class MetricSpace<P> {
  points: Set<P> = new Set();
  distance: (a: P, b: P) => Promise<number>;

  constructor(distance: (a: P, b: P) => Promise<number>) {
    this.distance = distance;
  }

  get size() {
    return this.points.size;
  }

  addPoint(point: P) {
    this.points.add(point);
  }

  removePoint(point: P) {
    this.points.delete(point);
  }

  async getNearestNeighbors(point: P, k: number): Promise<P[]> {
    console.log(`getNearestNeighbors ${point} ${k}`);
    const points = Array.from(this.points);
    const distances = [];
    for (const p of points) {
      distances.push(await this.distance(point, p));
    }
    const sortedPoints = points.sort((a, b) => {
      const aIndex = points.indexOf(a);
      const bIndex = points.indexOf(b);
      return distances[aIndex] - distances[bIndex];
    });
    return sortedPoints.slice(0, k);
  }

  async getFarthestNeighbors(point: P, k: number): Promise<P[]> {
    const points = Array.from(this.points);
    const distances = await Promise.all(
      points.map((p) => this.distance(point, p))
    );
    const sortedPoints = points.sort((a, b) => {
      const aIndex = points.indexOf(a);
      const bIndex = points.indexOf(b);
      return distances[bIndex] - distances[aIndex];
    });
    return sortedPoints.slice(0, k);
  }

  getNearestNeighbor(point: P): Promise<P> {
    return this.getNearestNeighbors(point, 1)[0];
  }

  getFarthestNeighbor(point: P): Promise<P> {
    return this.getFarthestNeighbors(point, 1)[0];
  }
}
