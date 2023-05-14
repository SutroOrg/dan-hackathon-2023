import * as math from "mathjs";
import { det, showMatrix, trace } from "./matrix.js";

try {
  const A = math.matrix([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]);

  const B = math.matrix([
    [3, 1, 5],
    [3, 3, 1],
    [4, 6, 4],
  ]);

  const determ = det(A);

  showMatrix(A);
  const tr = trace(A);

  console.log({ determ, tr });

  const eigs = math.eigs(A);

  console.log(eigs);
} catch (e) {
  console.error(e);
}
