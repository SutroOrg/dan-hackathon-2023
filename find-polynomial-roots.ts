import { Complex } from "./complex.js";
import { inspect } from "util";

function durandKerner(
  coefficients: number[],
  maxIterations: number = 1000,
  epsilon: number = 1e-6
): number[] {
  const n = coefficients.length - 1; // degree of polynomial
  const roots: number[] = new Array(n).fill(0); // initialize roots to 0
  const delta = (2 * Math.PI) / n; // angle between roots
  console.log({ n, delta });

  let iterations = 0;
  let converged = false;
  while (!converged && iterations < maxIterations) {
    converged = true;

    for (let i = 0; i < n; i++) {
      let z = roots[i];
      let f = polynomial(z, coefficients);

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          f /= z - roots[j];
        }
      }

      let newZ = z - f * delta;

      if (Math.abs(newZ - z) > epsilon) {
        converged = false;
      }

      roots[i] = newZ;
    }

    iterations++;
  }

  return roots;
}

function polynomial(x: number, coefficients: number[]): number {
  let result = 0;

  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = result * x + coefficients[i];
  }

  return result;
}

export function findPolynomialRoots(coefficients: number[]): number[] {
  console.log(`Finding roots of ${coefficients}`);
  return durandKerner(coefficients.map((c) => (c === -0 ? 0 : c)));
}
