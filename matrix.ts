import * as math from "mathjs";
import { type Matrix } from "mathjs";
import { inspect } from "util";

export const isSymmetric = (matrix: Matrix): boolean => {
  return Boolean(math.deepEqual(matrix, math.transpose(matrix)));
};

export const getMatrixDimensions = (matrix: Matrix): number[] => {
  return matrix.size();
};

export const showMatrix = <E = number>(
  matrix: Matrix,
  formatter: (elem: E) => string = (x) => String(x),
  showBrackets = true
) => {
  const asArray = matrix.toArray();
  const rows = asArray.map((row) =>
    showBrackets
      ? `⎢ ${row.map(formatter).join(" ")} ⎥`
      : row.map(formatter).join(" ")
  );
  const rowLength = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (showBrackets) {
    console.log(`⎡${" ".repeat(rowLength - 2)}⎤`);
  }
  rows.forEach((row) => {
    console.log(`${row}`);
  });
  if (showBrackets) {
    console.log(`⎣${" ".repeat(rowLength - 2)}⎦`);
  }
};

export const add = (a: Matrix, b: Matrix) => {
  return math.add(a, b);
};

export const subtract = (a: Matrix, b: Matrix) => {
  return math.subtract(a, b);
};

export const getIdentityMatrix = (size: number) => {
  return math.identity(size);
};

export const getZeroMatrix = (size: number) => {
  return math.zeros(size);
};

export const det = (matrix: Matrix): number => {
  return math.det(matrix);
};

export const transpose = (matrix: Matrix): Matrix => {
  return math.transpose(matrix);
};

export const inverse = (matrix: Matrix): Matrix => {
  return math.inv(matrix);
};

export const scale = (matrix: Matrix, scalar: number): Matrix => {
  return math.multiply(matrix, scalar);
};

export const multiply = (matrixA: Matrix, matrixB: Matrix) => {
  return math.multiply(matrixA, matrixB);
};

export const trace = (matrix: Matrix): number => {
  return math.trace(matrix);
};

export const normalizeRows = (matrix: Matrix): Matrix => {
  const normalized: number[][] = matrix.toArray().map((row) => {
    const rowLength = Math.sqrt(
      row.reduce((sum, elem) => sum + elem * elem, 0)
    );
    return row.map((elem) => elem / rowLength);
  });
  return math.matrix(normalized);
};
